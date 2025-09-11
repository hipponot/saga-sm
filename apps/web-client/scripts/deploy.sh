#!/bin/bash

# Manual deployment script for Saga-SM Web Client Frontend
# Creates ephemeral branches and deploys to Amplify using SSM parameters

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_ROOT="$(dirname "$(dirname "$PROJECT_ROOT")")"
BUILD_ENV=${BUILD_ENV:-dev}
BRANCH_NAME=${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD)}
AWS_REGION=${AWS_REGION:-us-west-2}
SKIP_BUILD=${SKIP_BUILD:-false}
SKIP_INSTALL=${SKIP_INSTALL:-false}
FORCE=${FORCE:-false}
CLEAN_CACHE=${CLEAN_CACHE:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_step() {
    echo -e "${BLUE}🔵 $1${NC}"
}

# AWS error diagnosis helper
diagnose_aws_error() {
    local error_output="$1"
    local command_context="$2"
    
    echo ""
    log_error "AWS command failed: $command_context"
    
    # Check for common error patterns
    if echo "$error_output" | grep -qi "NoCredentialsError\|Unable to locate credentials"; then
        log_error "🔐 AWS credentials not configured"
        echo "  💡 Try one of these:"
        echo "     aws configure"
        echo "     aws sso login"
        echo "     export AWS_PROFILE=your-profile"
        
    elif echo "$error_output" | grep -qi "TokenRefreshRequired\|SSO session has expired"; then
        log_error "🔐 SSO session expired"
        echo "  💡 Try: aws sso login"
        
    elif echo "$error_output" | grep -qi "AccessDenied\|UnauthorizedOperation\|Forbidden"; then
        log_error "🚫 Insufficient permissions"
        echo "  💡 Check that your AWS user/role has the required permissions:"
        echo "     - SSM: GetParameter"
        echo "     - Amplify: GetApp, GetBranch, CreateBranch, CreateDeployment"
        
    elif echo "$error_output" | grep -qi "ParameterNotFound"; then
        log_error "📋 SSM parameter not found"
        echo "  💡 Possible causes:"
        echo "     - Parameter doesn't exist (check: sam deploy)"
        echo "     - Wrong region (current: $AWS_REGION)"
        echo "     - Wrong parameter path"
        echo "     - Insufficient SSM permissions"
        
    elif echo "$error_output" | grep -qi "InvalidUserID.NotFound\|does not exist"; then
        log_error "🏗️  Resource not found"
        echo "  💡 Make sure infrastructure is deployed:"
        echo "     sam deploy"
        
    elif echo "$error_output" | grep -qi "endpoint.*could not be resolved\|gaierror"; then
        log_error "🌐 Network/DNS error"
        echo "  💡 Check your internet connection and AWS region"
        
    else
        log_error "❓ Unexpected AWS error"
        echo "  Raw error: $error_output"
    fi
    
    echo ""
    echo "  🔍 Debug commands:"
    echo "     aws sts get-caller-identity  # Check current AWS identity"
    echo "     aws configure list           # Check AWS configuration"
    echo "     aws ssm describe-parameters --region $AWS_REGION --query 'Parameters[?starts_with(Name, \`/saga-sm/\`)].Name'  # List saga-sm parameters"
    if [[ "$command_context" == *"parameter"* ]]; then
        # Extract parameter name from context if it's a parameter-related error
        local param_path=$(echo "$command_context" | sed -n 's/.*get-parameter \([^ ]*\).*/\1/p')
        if [ -n "$param_path" ]; then
            echo "     aws ssm get-parameter --name '$param_path' --region $AWS_REGION  # Test this specific parameter"
            echo "     aws ssm describe-parameters --region $AWS_REGION --filters 'Key=Name,Values=$param_path'  # Check if parameter exists"
        fi
    fi
    echo "     aws cloudformation describe-stacks --region $AWS_REGION --query 'Stacks[?contains(StackName, \`saga-sm\`)].StackName'  # List saga-sm stacks"
    echo ""
}

# Get SSM parameter with error handling
get_ssm_parameter() {
    local param_name="$1"
    local required="${2:-true}"
    
    local result
    result=$(aws ssm get-parameter \
        --name "$param_name" \
        --region "$AWS_REGION" \
        --query "Parameter.Value" \
        --output text 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "$result"
        return 0
    else
        if [ "$required" = "true" ]; then
            diagnose_aws_error "$result" "get-parameter $param_name"
            log_error "Cannot continue without required parameter: $param_name"
            exit 1
        else
            return 1
        fi
    fi
}

# Basic AWS configuration check
check_aws_config() {
    log_step "Checking AWS configuration"
    
    # Check if we can make a basic AWS call
    local caller_identity
    caller_identity=$(aws sts get-caller-identity --region "$AWS_REGION" 2>&1) || {
        diagnose_aws_error "$caller_identity" "get-caller-identity"
        return 1
    }
    
    local account_id=$(echo "$caller_identity" | jq -r '.Account // empty')
    local user_arn=$(echo "$caller_identity" | jq -r '.Arn // empty')
    
    if [ -n "$account_id" ] && [ -n "$user_arn" ]; then
        log_info "✅ AWS configuration valid"
        log_info "   Account: $account_id"
        log_info "   Identity: $user_arn"
        log_info "   Region: $AWS_REGION"
        return 0
    else
        log_error "❌ Could not verify AWS configuration"
        return 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            BUILD_ENV="$2"
            shift 2
            ;;
        --branch)
            BRANCH_NAME="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --clean-cache)
            CLEAN_CACHE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --env ENV           Build environment (dev|qa|prod) [default: dev]"
            echo "  --branch BRANCH     Amplify branch name [default: current git branch]"
            echo "  --skip-build        Skip the build step (use existing build)"
            echo "  --skip-install      Skip npm install (use existing node_modules)"
            echo "  --force             Skip interactive prompts (non-interactive mode)"
            echo "  --clean-cache       Clean Turbo cache before building"
            echo "  --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Deploy current branch to dev"
            echo "  $0 --env qa                           # Deploy to qa environment"
            echo "  $0 --branch feature/user-auth        # Deploy feature branch (becomes feature-user-auth)"
            echo "  $0 --skip-build                      # Deploy existing build"
            echo "  $0 --force                           # Skip all interactive prompts"
            echo "  $0 --clean-cache                     # Force rebuild by cleaning Turbo cache"
            echo "  $0 --env qa --force --clean-cache    # CI/CD with fresh build"
            echo ""
            echo "Branch Mapping:"
            echo "  • main branch               → Uses 'main' Amplify branch (prod)"
            echo "  • develop branch            → Uses 'develop' Amplify branch (qa)"
            echo "  • feature/user-auth         → Creates 'feature-user-auth' ephemeral branch"
            echo "  • bugfix/api-timeout        → Creates 'bugfix-api-timeout' ephemeral branch"
            echo "  • PR branches               → Creates 'pr-{number}' branch"
            echo ""
            echo "Prerequisites:"
            echo "  • Infrastructure deployed: sam deploy"
            echo "  • AWS credentials configured"
            echo "  • SSM parameters exist from CloudFormation"
            echo "  • Dependencies installed: pnpm install (from workspace root)"
            echo "  • For monorepo: pnpm or turbo available for dependency builds"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Normalize branch name for Amplify (replace / with -, limit length)
AMPLIFY_BRANCH_NAME=$(echo "$BRANCH_NAME" | sed 's/\//-/g' | cut -c1-63)

# Special handling for main/develop branches and PRs
if [ "$BRANCH_NAME" == "main" ]; then
    AMPLIFY_BRANCH_NAME="main"
    BUILD_ENV="prod"
elif [ "$BRANCH_NAME" == "develop" ]; then
    AMPLIFY_BRANCH_NAME="develop"
    BUILD_ENV="qa"
elif [[ "$GITHUB_EVENT_NAME" == "pull_request" ]]; then
    AMPLIFY_BRANCH_NAME="pr-${GITHUB_PULL_REQUEST_NUMBER:-$AMPLIFY_BRANCH_NAME}"
fi

# Display configuration
echo "========================================="
echo "🚀 Saga-SM Web Client Deployment"
echo "========================================="
echo ""
log_info "Configuration:"
echo "  Git Branch:      $BRANCH_NAME"
echo "  Amplify Branch:  $AMPLIFY_BRANCH_NAME"
echo "  Build Env:       $BUILD_ENV"
echo "  AWS Region:      $AWS_REGION"
echo "  Project Root:    $PROJECT_ROOT"
echo "  Skip Build:      $SKIP_BUILD"
echo "  Skip Install:    $SKIP_INSTALL"
echo "  Force Mode:      $FORCE"
echo "  Clean Cache:     $CLEAN_CACHE"
echo ""

# Check prerequisites
command -v aws >/dev/null 2>&1 || { log_error "AWS CLI is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed."; exit 1; }
command -v zip >/dev/null 2>&1 || { log_error "zip is required but not installed."; exit 1; }
command -v jq >/dev/null 2>&1 || { log_error "jq is required but not installed."; exit 1; }

# Check AWS configuration
check_aws_config || exit 1

# Step 1: Get configuration from SSM
log_step "Step 1: Retrieving configuration from SSM Parameter Store"

AMPLIFY_APP_ID=$(get_ssm_parameter "/saga-sm/web-client/amplify/app-id")

if ! AMPLIFY_DOMAIN=$(get_ssm_parameter "/saga-sm/web-client/amplify/domain" false); then
    log_warning "Could not retrieve domain from SSM (will use app ID)"
    AMPLIFY_DOMAIN="${AMPLIFY_APP_ID}.amplifyapp.com"
fi

# Normalize domain (strip https:// and extract base domain if needed)
AMPLIFY_DOMAIN=${AMPLIFY_DOMAIN#https://}
if [[ "$AMPLIFY_DOMAIN" == *.amplifyapp.com ]] && [[ "$AMPLIFY_DOMAIN" != "$AMPLIFY_APP_ID.amplifyapp.com" ]]; then
    # Extract base domain if it has a branch prefix
    AMPLIFY_DOMAIN=$(echo "$AMPLIFY_DOMAIN" | sed -E 's/^[^.]*\.//')
fi

log_info "✅ Found Amplify App: $AMPLIFY_APP_ID"
log_info "✅ Domain: $AMPLIFY_DOMAIN"

# Change to project root
cd "$PROJECT_ROOT"

# Step 2: Install dependencies (if not skipped)
if [ "$SKIP_INSTALL" != "true" ]; then
    log_step "Step 2: Installing dependencies"
    
    cd "$WORKSPACE_ROOT"
    if command -v pnpm >/dev/null 2>&1 && [ -f "pnpm-workspace.yaml" ]; then
        log_info "📦 Installing workspace dependencies with pnpm..."
        if [ "$FORCE" = "true" ]; then
            pnpm install --force
        else
            pnpm install
        fi
    else
        # Fallback to npm in web-client directory
        log_warning "pnpm workspace not detected, falling back to npm"
        cd "$PROJECT_ROOT"
        if [ -f "package-lock.json" ]; then
            npm ci
        else
            npm install
        fi
    fi
else
    log_warning "Skipping dependency installation"
fi

# Step 3: Build the application (if not skipped)
if [ "$SKIP_BUILD" != "true" ]; then
    log_step "Step 3: Building application and dependencies for $BUILD_ENV environment"

    # Get API URL from SSM for the current environment
    if ! API_URL=$(get_ssm_parameter "/saga-sm/web-client/api-url/$BUILD_ENV" false); then
        log_warning "Could not retrieve API URL from SSM, using fallback"
        API_URL="http://localhost:3000"
    fi
    log_info "🔗 Using API URL: $API_URL"

    # Set environment variables for build
    export BUILD_ENV
    export NEXT_TELEMETRY_DISABLED=1
    export NODE_ENV=production
    export NEXT_PUBLIC_SAGA_SM_API_URL="$API_URL"
    export NEXT_PUBLIC_TRPC_BASE_PATH="/trpc"

    # Clean previous build artifacts (only if requested or no Turbo cache)
    cd "$PROJECT_ROOT"
    if [ "$CLEAN_CACHE" = "true" ] || [ "$FORCE" = "true" ] || [ ! -d ".turbo" ]; then
        log_info "🧹 Cleaning previous build artifacts..."
        rm -rf .next out
        if [ -d "$WORKSPACE_ROOT/.turbo" ]; then
            log_info "🗑️  Cleaning Turbo workspace cache..."
            rm -rf "$WORKSPACE_ROOT/.turbo"
        fi
    else
        log_info "🎯 Preserving build cache for Turbo optimization..."
    fi

    # Build with workspace dependency resolution
    cd "$WORKSPACE_ROOT"
    
    if command -v turbo >/dev/null 2>&1 && [ -f "turbo.json" ]; then
        log_info "🏗️  Building with Turbo (leveraging cache and dependencies)..."
        
        # Clean cache if requested
        if [ "$CLEAN_CACHE" = "true" ]; then
            log_info "🧹 Cleaning Turbo cache..."
            turbo prune --filter="@saga-sm/web-client"
        fi
        
        # Check if build is needed (dry run)
        log_info "🔍 Checking if build is needed..."
        TURBO_ARGS="--filter=@saga-sm/web-client"
        
        # Check if we can use remote caching
        if [ -n "$TURBO_TOKEN" ] && [ -n "$TURBO_TEAM" ]; then
            log_info "📡 Using Turbo remote caching..."
            TURBO_ARGS="$TURBO_ARGS --remote-only"
        fi
        
        # Check what would be built
        TURBO_DRY=$(turbo run build $TURBO_ARGS --dry 2>/dev/null || echo "build-needed")
        if echo "$TURBO_DRY" | grep -q "0 successful, 0 total"; then
            log_info "✨ Build cache hit! Nothing needs to be rebuilt."
        else
            log_info "🔨 Changes detected, building..."
        fi
        
        # Build with dependency auto-resolution
        turbo run build $TURBO_ARGS
        
        # Turbo handles dependencies, so no need to reinstall unless there's a specific issue
        if [ ! -f "$PROJECT_ROOT/node_modules/.pnpm/lock.yaml" ] || [ ! -d "$PROJECT_ROOT/node_modules/@saga-sm/api-types" ]; then
            log_info "🔗 Refreshing workspace dependencies (dependency resolution issue detected)..."
            if [ "$FORCE" = "true" ]; then
                pnpm install --ignore-scripts --force
            else
                pnpm install --ignore-scripts
            fi
        else
            log_info "✅ Turbo managed dependencies successfully - no refresh needed"
        fi
    elif command -v pnpm >/dev/null 2>&1 && [ -f "pnpm-workspace.yaml" ]; then
        log_warning "🔄 Falling back to pnpm workspace (consider using Turbo for better caching)"
        log_info "🏗️  Building with pnpm workspace..."
        log_info "🔧 Building API types package..."
        pnpm --filter="@saga-sm/api-types" run build
        log_info "🔗 Refreshing workspace dependencies..."
        if [ "$FORCE" = "true" ]; then
            pnpm install --ignore-scripts --force
        else
            pnpm install --ignore-scripts
        fi
        log_info "🌐 Building web client..."
        pnpm --filter="@saga-sm/web-client" run build
    else
        log_error "Neither turbo nor pnpm workspace detected"
        log_error "This monorepo requires either turbo or pnpm for proper builds"
        log_error "💡 Install turbo: pnpm add -g turbo"
        exit 1
    fi

    # Verify build output
    cd "$PROJECT_ROOT"
    if [ ! -d "out" ]; then
        log_error "Build did not produce expected 'out' directory"
        exit 1
    fi

    # Add build metadata
    echo "{\"buildTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"commit\":\"$(git rev-parse HEAD 2>/dev/null || echo 'unknown')\",\"branch\":\"$BRANCH_NAME\",\"amplifyBranch\":\"$AMPLIFY_BRANCH_NAME\",\"env\":\"$BUILD_ENV\",\"amplifyAppId\":\"$AMPLIFY_APP_ID\",\"apiUrl\":\"$API_URL\"}" > out/build-info.json

    log_info "✅ Build completed"
else
    log_warning "Skipping build step"
    cd "$PROJECT_ROOT"
    if [ ! -d "out" ]; then
        log_error "No build found! Run without --skip-build or build manually first."
        exit 1
    fi
fi

# Step 4: Check/Create Amplify branch
log_step "Step 4: Managing Amplify branch: $AMPLIFY_BRANCH_NAME"

if ! aws amplify get-branch \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$AMPLIFY_BRANCH_NAME" \
    --region "$AWS_REGION" \
    >/dev/null 2>&1; then
    log_info "🌱 Creating new ephemeral branch: $AMPLIFY_BRANCH_NAME"

    # Determine stage based on branch type
    STAGE="DEVELOPMENT"
    if [ "$AMPLIFY_BRANCH_NAME" == "main" ]; then
        STAGE="PRODUCTION"
    elif [ "$AMPLIFY_BRANCH_NAME" == "develop" ]; then
        STAGE="BETA"
    fi

    if ! aws amplify create-branch \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$AMPLIFY_BRANCH_NAME" \
        --no-enable-auto-build \
        --stage "$STAGE" \
        --region "$AWS_REGION" \
        --tags "Environment=$BUILD_ENV,Type=ephemeral,GitBranch=$BRANCH_NAME" \
        >/dev/null 2>&1; then
        log_error "Failed to create Amplify branch: $AMPLIFY_BRANCH_NAME"
        exit 1
    fi

    # Wait for branch to be ready
    sleep 3
    log_info "✅ Branch created successfully"
else
    log_info "✅ Branch already exists: $AMPLIFY_BRANCH_NAME"
fi

# Step 5: Create deployment package
log_step "Step 5: Creating deployment package"

# Clean up old package if exists
rm -f deploy.zip

# Create zip from out directory (Next.js static export output)
cd out
zip -r ../deploy.zip . -q
cd ..

PACKAGE_SIZE=$(du -h deploy.zip | cut -f1)
log_info "✅ Deployment package created: $PACKAGE_SIZE"

# Step 6: Deploy to Amplify
log_step "Step 6: Deploying to Amplify"

# Create deployment and get upload URL
log_info "📋 Creating Amplify deployment..."
DEPLOYMENT=$(aws amplify create-deployment \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$AMPLIFY_BRANCH_NAME" \
    --region "$AWS_REGION" \
    --output json 2>&1)

if [ $? -ne 0 ]; then
    diagnose_aws_error "$DEPLOYMENT" "create-deployment"
    log_error "Failed to create Amplify deployment"
    echo ""
    log_error "🔍 Common cause: Missing amplify:CreateDeployment permission"
    log_error "   Test with: aws amplify create-deployment --app-id $AMPLIFY_APP_ID --branch-name test-permissions --region $AWS_REGION"
    log_error "   See DEPLOYMENT_GUIDE.md for permission verification steps"
    exit 1
fi

UPLOAD_URL=$(echo "$DEPLOYMENT" | jq -r '.zipUploadUrl')
JOB_ID=$(echo "$DEPLOYMENT" | jq -r '.jobId // empty')

if [ -z "$UPLOAD_URL" ] || [ "$UPLOAD_URL" = "null" ]; then
    log_error "Failed to get upload URL from Amplify"
    log_error "Make sure the Amplify app was created without GitHub integration."
    exit 1
fi

# Upload the deployment package
log_info "📤 Uploading package to Amplify..."
UPLOAD_RESPONSE=$(curl -X PUT "$UPLOAD_URL" \
    --data-binary @deploy.zip \
    --header "Content-Type: application/zip" \
    --write-out "HTTPSTATUS:%{http_code}" \
    --silent --show-error 2>&1)

UPLOAD_HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | grep -o 'HTTPSTATUS:[0-9]*' | cut -d: -f2)

if [ "$UPLOAD_HTTP_CODE" != "200" ]; then
    log_error "Package upload failed with HTTP $UPLOAD_HTTP_CODE"
    log_error "Upload response: $UPLOAD_RESPONSE"
    exit 1
else
    log_info "✅ Package uploaded successfully"
fi

# Start the deployment job if needed
if [ -z "$JOB_ID" ]; then
    log_info "🚀 Starting deployment job..."
    JOB_ID=$(aws amplify start-deployment \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$AMPLIFY_BRANCH_NAME" \
        --region "$AWS_REGION" \
        --query "jobSummary.jobId" \
        --output text)
else
    # For manual deployments, we need to trigger the existing job
    log_info "🚀 Starting deployment job: $JOB_ID"
    aws amplify start-deployment \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$AMPLIFY_BRANCH_NAME" \
        --job-id "$JOB_ID" \
        --region "$AWS_REGION" > /dev/null
fi

log_info "✅ Deployment job started: $JOB_ID"

# Step 7: Wait for deployment to complete
log_step "Step 7: Waiting for deployment to complete"

TIMEOUT=600  # 10 minutes
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(aws amplify get-job \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$AMPLIFY_BRANCH_NAME" \
        --job-id "$JOB_ID" \
        --region "$AWS_REGION" \
        --query "job.summary.status" \
        --output text 2>/dev/null || echo "PENDING")

    if [ "$STATUS" == "SUCCEED" ]; then
        log_info "✅ Deployment successful!"
        break
    elif [ "$STATUS" == "FAILED" ] || [ "$STATUS" == "CANCELLED" ]; then
        log_error "Deployment failed with status: $STATUS"

        # Try to get error details
        ERROR_MSG=$(aws amplify get-job \
            --app-id "$AMPLIFY_APP_ID" \
            --branch-name "$AMPLIFY_BRANCH_NAME" \
            --job-id "$JOB_ID" \
            --region "$AWS_REGION" \
            --query "job.summary.statusReason" \
            --output text 2>/dev/null || echo "Unknown error")

        log_error "Error: $ERROR_MSG"
        exit 1
    fi

    # Show progress
    printf "  ⏳ Status: %-10s [%3d seconds elapsed]\r" "$STATUS" "$ELAPSED"

    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    log_error "Deployment timed out after $TIMEOUT seconds"
    exit 1
fi

# Step 8: Clean up
log_step "Step 8: Cleaning up"
rm -f deploy.zip

# Step 9: Display results
echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""

# Construct URL (Amplify converts underscores to hyphens in URLs)
AMPLIFY_URL_BRANCH_NAME="${AMPLIFY_BRANCH_NAME//_/-}"
DEPLOY_URL="https://${AMPLIFY_URL_BRANCH_NAME}.${AMPLIFY_DOMAIN}"

log_info "🌐 Deployment URL: $DEPLOY_URL"
echo ""
echo "📊 Deployment Details:"
echo "  Git Branch:       $BRANCH_NAME"
echo "  Amplify Branch:   $AMPLIFY_BRANCH_NAME"
echo "  Environment:      $BUILD_ENV"
echo "  App ID:           $AMPLIFY_APP_ID"
echo "  Job ID:           $JOB_ID"
echo "  URL:              $DEPLOY_URL"
echo ""

# Show helpful commands
echo "🔧 Useful Commands:"
echo "  View in AWS Console:"
echo "    https://console.aws.amazon.com/amplify/home#/$AMPLIFY_APP_ID"
echo ""
echo "  Delete this branch (when done):"
echo "    aws amplify delete-branch --app-id $AMPLIFY_APP_ID --branch-name $AMPLIFY_BRANCH_NAME"
echo ""
echo "  View deployment logs:"
echo "    aws amplify get-job --app-id $AMPLIFY_APP_ID --branch-name $AMPLIFY_BRANCH_NAME --job-id $JOB_ID"
echo ""

# Provide branch type context
if [[ "$AMPLIFY_BRANCH_NAME" == pr-* ]]; then
    echo "🔄 This is a PR preview branch - it will be auto-deleted when PR closes"
elif [[ "$AMPLIFY_BRANCH_NAME" != "main" && "$AMPLIFY_BRANCH_NAME" != "develop" ]]; then
    echo "🗑️  This is an ephemeral branch - remember to delete when no longer needed"
else
    echo "🏠 This is a persistent branch ($AMPLIFY_BRANCH_NAME)"
fi

# Optional: Open in browser (only in interactive mode)
if [ "$FORCE" != "true" ] && command -v open >/dev/null 2>&1 && [[ -t 0 ]]; then
    echo ""
    read -p "🌐 Open in browser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "$DEPLOY_URL"
    fi
fi

log_info "Done! 🎉"
