#!/bin/bash

# Manual deployment script for Saga-SM Web Client Frontend
# Creates ephemeral branches and deploys to Amplify using SSM parameters

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_ENV=${BUILD_ENV:-dev}
BRANCH_NAME=${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD)}
AWS_REGION=${AWS_REGION:-us-west-2}
SKIP_BUILD=${SKIP_BUILD:-false}
SKIP_INSTALL=${SKIP_INSTALL:-false}

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
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --env ENV           Build environment (dev|qa|prod) [default: dev]"
            echo "  --branch BRANCH     Amplify branch name [default: current git branch]"
            echo "  --skip-build        Skip the build step (use existing build)"
            echo "  --skip-install      Skip npm install (use existing node_modules)"
            echo "  --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                           # Deploy current branch to dev"
            echo "  $0 --env qa                  # Deploy to qa environment"
            echo "  $0 --branch feature-xyz      # Deploy to specific Amplify branch"
            echo "  $0 --skip-build              # Deploy existing build"
            echo ""
            echo "Branch Mapping:"
            echo "  • main branch      → Uses 'main' Amplify branch (prod)"
            echo "  • develop branch   → Uses 'develop' Amplify branch (qa)"
            echo "  • feature branches → Creates ephemeral Amplify branch"
            echo "  • PR branches      → Creates 'pr-{number}' Amplify branch"
            echo ""
            echo "Prerequisites:"
            echo "  • Infrastructure deployed: sam deploy"
            echo "  • AWS credentials configured"
            echo "  • SSM parameters exist from CloudFormation"
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
echo ""

# Check prerequisites
command -v aws >/dev/null 2>&1 || { log_error "AWS CLI is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed."; exit 1; }
command -v zip >/dev/null 2>&1 || { log_error "zip is required but not installed."; exit 1; }

# Step 1: Get configuration from SSM
log_step "Step 1: Retrieving configuration from SSM Parameter Store"

AMPLIFY_APP_ID=$(aws ssm get-parameter \
    --name "/saga-sm/web-client/amplify/app-id" \
    --region "$AWS_REGION" \
    --query "Parameter.Value" \
    --output text 2>/dev/null) || {
    log_error "Failed to get Amplify App ID from SSM parameter"
    log_error "Make sure infrastructure is deployed: sam deploy"
    exit 1
}

AMPLIFY_DOMAIN=$(aws ssm get-parameter \
    --name "/saga-sm/web-client/amplify/domain" \
    --region "$AWS_REGION" \
    --query "Parameter.Value" \
    --output text 2>/dev/null) || {
    log_warning "Could not retrieve domain from SSM (will use app ID)"
    AMPLIFY_DOMAIN="${AMPLIFY_APP_ID}.amplifyapp.com"
}

# Strip https:// prefix if it exists in the domain
AMPLIFY_DOMAIN=${AMPLIFY_DOMAIN#https://}

# Extract just the base domain (remove any existing branch prefix)
# If domain is like "staging.d2jpp1ywz4pb1c.amplifyapp.com", get "d2jpp1ywz4pb1c.amplifyapp.com"
if [[ "$AMPLIFY_DOMAIN" == *.amplifyapp.com ]]; then
    # Extract the base domain by removing everything before the app ID
    AMPLIFY_DOMAIN=$(echo "$AMPLIFY_DOMAIN" | sed -E 's/^[^.]*\.//')
fi

log_info "✅ Found Amplify App: $AMPLIFY_APP_ID"
log_info "✅ Domain: $AMPLIFY_DOMAIN"

# Change to project root
cd "$PROJECT_ROOT"

# Step 2: Install dependencies (if not skipped)
if [ "$SKIP_INSTALL" != "true" ]; then
    log_step "Step 2: Installing dependencies"
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
else
    log_warning "Skipping dependency installation"
fi

# Step 3: Build the application (if not skipped)
if [ "$SKIP_BUILD" != "true" ]; then
    log_step "Step 3: Building Next.js application for $BUILD_ENV environment"

    # Clean previous build artifacts to ensure fresh build
    log_info "🧹 Cleaning previous build artifacts..."
    rm -rf .next out

    # Get API URL from SSM for the current environment
    API_URL_PARAM="/saga-sm/web-client/api-url/$BUILD_ENV"
    API_URL=$(aws ssm get-parameter \
        --name "$API_URL_PARAM" \
        --region "$AWS_REGION" \
        --query "Parameter.Value" \
        --output text 2>/dev/null) || {
        log_warning "Could not retrieve API URL from SSM parameter: $API_URL_PARAM"
        API_URL="http://localhost:3000"  # fallback
    }

    log_info "🔗 Using API URL: $API_URL"

    # Set environment variables for Next.js build
    export BUILD_ENV
    export NEXT_TELEMETRY_DISABLED=1
    export NODE_ENV=production
    export NEXT_PUBLIC_SAGA_SM_API_URL="$API_URL"
    export NEXT_PUBLIC_TRPC_BASE_PATH="/trpc"
    
    # Run Next.js build (which includes static export)
    npm run build

    # Add build metadata
    mkdir -p out
    echo "{\"buildTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"commit\":\"$(git rev-parse HEAD 2>/dev/null || echo 'unknown')\",\"branch\":\"$BRANCH_NAME\",\"amplifyBranch\":\"$AMPLIFY_BRANCH_NAME\",\"env\":\"$BUILD_ENV\",\"amplifyAppId\":\"$AMPLIFY_APP_ID\",\"apiUrl\":\"$API_URL\"}" > out/build-info.json

    log_info "✅ Build completed"
else
    log_warning "Skipping build step"

    # Check if build exists
    if [ ! -d "out" ]; then
        log_error "No build found! Run without --skip-build or build manually first."
        exit 1
    fi
fi

# Step 4: Check/Create Amplify branch
log_step "Step 4: Managing Amplify branch: $AMPLIFY_BRANCH_NAME"

BRANCH_EXISTS=$(aws amplify get-branch \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$AMPLIFY_BRANCH_NAME" \
    --region "$AWS_REGION" \
    2>/dev/null || echo "")

if [ -z "$BRANCH_EXISTS" ]; then
    log_info "🌱 Creating new ephemeral branch: $AMPLIFY_BRANCH_NAME"

    # Determine stage based on branch type
    STAGE="DEVELOPMENT"
    if [ "$AMPLIFY_BRANCH_NAME" == "main" ]; then
        STAGE="PRODUCTION"
    elif [ "$AMPLIFY_BRANCH_NAME" == "develop" ]; then
        STAGE="BETA"
    fi

    aws amplify create-branch \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$AMPLIFY_BRANCH_NAME" \
        --no-enable-auto-build \
        --stage "$STAGE" \
        --region "$AWS_REGION" \
        --tags "Environment=$BUILD_ENV,Type=ephemeral,GitBranch=$BRANCH_NAME" > /dev/null

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
DEPLOYMENT=$(aws amplify create-deployment \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$AMPLIFY_BRANCH_NAME" \
    --region "$AWS_REGION" \
    --output json)

UPLOAD_URL=$(echo "$DEPLOYMENT" | jq -r '.zipUploadUrl')
JOB_ID=$(echo "$DEPLOYMENT" | jq -r '.jobId // empty')

if [ -z "$UPLOAD_URL" ]; then
    log_error "Failed to get upload URL from Amplify"
    log_error "This might indicate the app has GitHub integration enabled."
    log_error "Make sure the Amplify app was created without repository connection."
    exit 1
fi

# Upload the deployment package
log_info "📤 Uploading package to Amplify..."
curl -X PUT "$UPLOAD_URL" \
    --data-binary @deploy.zip \
    --header "Content-Type: application/zip" \
    --silent --show-error

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
if command -v open >/dev/null 2>&1 && [[ -t 0 ]]; then
    echo ""
    read -p "🌐 Open in browser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "$DEPLOY_URL"
    fi
fi

log_info "Done! 🎉"
