#!/bin/bash

# Build, push, and optionally deploy Docker image for saga-sm API
#
# Usage: ./build-push-deploy.sh [OPTIONS] [TAG] [ENVIRONMENT] [DEPLOY]
#   --local     - Use local saga-soa dependencies (requires saga-soa as sibling directory)
#   TAG         - Docker image base tag (default: latest)
#   ENVIRONMENT - Deployment environment: dev|qa|prod|ephemeral (default: dev)  
#   DEPLOY      - Whether to deploy after push: true|false (default: true)
#
# Prerequisites:
#   - AWS CLI configured with appropriate permissions
#   - Docker running and accessible
#   - GitHub CLI (gh) authenticated with 'repo' and 'read:packages' scopes (for published mode)
#
# Dependency Modes:
#   - Published Mode (default): Uses @hipponot packages from GitHub Packages (requires auth)
#   - Local Mode (--local): Uses saga-soa as sibling directory (file: dependencies)
#
# GitHub Authentication:
#   For published packages (default mode), the script requires GitHub CLI authentication:
#   - Initial setup: gh auth login --hostname github.com --scopes 'repo,read:packages'
#   - Token refresh: gh auth refresh --hostname github.com --scopes 'repo,read:packages'
#   - The script will automatically handle token retrieval and Docker build args
#
# Environment Mapping:
#   - dev       → uses 'default' section in samconfig.yaml
#   - qa        → uses 'qa' section in samconfig.yaml
#   - prod      → uses 'prod' section in samconfig.yaml
#   - ephemeral → uses 'ephemeral' section in samconfig.yaml
#
# Tagging Strategy:
#   - Builds image with base tag locally
#   - Pushes to ECR with both 'latest' and unique timestamped tag
#   - Uses timestamped tag for deployment to force CloudFormation updates
#   - Example: 'v1.2.3' becomes 'v1.2.3-20241210-143022' for deployment
#
# Examples:
#   ./build-push-deploy.sh                    # Build latest with published packages, deploy to dev
#   ./build-push-deploy.sh v1.2.3             # Build v1.2.3 with published packages, deploy to dev
#   ./build-push-deploy.sh v1.2.3 qa          # Build v1.2.3 with published packages, deploy to qa
#   ./build-push-deploy.sh v1.2.3 qa false    # Build v1.2.3 with published packages, push to ECR, skip deploy
#   ./build-push-deploy.sh --local            # Build latest with local saga-soa, deploy to dev
#   ./build-push-deploy.sh --local v1.2.3 qa  # Build v1.2.3 with local saga-soa, deploy to qa
#   AWS_PROFILE=prod ./build-push-deploy.sh v1.2.3 prod  # Deploy to prod with specific AWS profile

set -e

# Trap to ensure cleanup on exit
trap 'cleanup_dependencies' EXIT

# Configuration
AWS_REGION="us-west-2"
AWS_ACCOUNT_ID="531314149529"
IMAGE_NAME="saga-sm-api"
ECR_REPOSITORY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$API_ROOT/../.." && pwd)"
DEV_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
SAGA_SOA_ROOT="$(cd "$DEV_ROOT/saga-soa" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}ℹ️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_step() { echo -e "${BLUE}🔵 $1${NC}"; }

# Check required tools and access
check_prerequisites() {
    local missing=()
    
    command -v aws >/dev/null 2>&1 || missing+=("aws CLI")
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    docker info >/dev/null 2>&1 || missing+=("docker (not running)")
    aws sts get-caller-identity >/dev/null 2>&1 || missing+=("AWS credentials")
    command -v gh >/dev/null 2>&1 || missing+=("GitHub CLI (gh)")
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing requirements: ${missing[*]}"
        log_error "See deployment guide for setup instructions"
        exit 1
    fi
}

# Setup GitHub authentication for published packages
setup_github_auth() {
    log_step "Setting up GitHub authentication for published packages"
    
    # Always prefer keyring token over environment variable for reliability
    # Environment tokens often lack proper scopes or are expired
    if [ -n "$GITHUB_TOKEN" ]; then
        log_info "Found GITHUB_TOKEN in environment, testing validity..."
        
        # Test the current token
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            "https://api.github.com/orgs/hipponot/packages?package_type=npm")
        
        if [ "$HTTP_CODE" = "200" ]; then
            log_info "✅ Environment token is valid and has package access"
            return 0
        else
            log_warning "Environment token failed (HTTP $HTTP_CODE)"
            log_info "Clearing environment token and using keyring token for reliability..."
            unset GITHUB_TOKEN
        fi
    fi
    
    # Check if GitHub CLI is authenticated
    if ! gh auth status >/dev/null 2>&1; then
        log_error "GitHub CLI is not authenticated"
        log_info "Please run: gh auth login --hostname github.com --scopes 'repo,read:packages'"
        exit 1
    fi
    
    # Get GitHub token
    GITHUB_TOKEN=$(gh auth token 2>/dev/null)
    if [ -z "$GITHUB_TOKEN" ]; then
        log_error "Failed to get GitHub token"
        log_info "Please refresh your GitHub token with package access:"
        log_info "gh auth refresh --hostname github.com --scopes 'repo,read:packages'"
        exit 1
    fi
    
    # Test the token first before potentially refreshing
    log_info "Testing current GitHub token..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        "https://api.github.com/orgs/hipponot/packages?package_type=npm")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_info "✅ Token is valid and working"
        export GITHUB_TOKEN
        return 0
    fi
    
    # Token didn't work, check scopes and refresh if needed
    log_info "Checking token scopes and refreshing if needed..."
    
    # Check if current active token has read:packages scope
    AUTH_STATUS=$(gh auth status 2>&1)
    ACTIVE_TOKEN_LINE=$(echo "$AUTH_STATUS" | grep -A4 "Active account: true")
    
    if ! echo "$ACTIVE_TOKEN_LINE" | grep -q "read:packages"; then
        log_warning "Active GitHub token lacks 'read:packages' scope"
        log_info "Refreshing token with correct scopes..."
        
        # If we have an environment token that's blocking, clear it first
        if [ -n "$GITHUB_TOKEN" ]; then
            log_info "Clearing environment token to allow keyring refresh..."
            unset GITHUB_TOKEN
        fi
        
        if ! gh auth refresh --hostname github.com --scopes "repo,read:packages" >/dev/null 2>&1; then
            log_error "Failed to refresh GitHub token"
            log_info "Please run manually: gh auth refresh --hostname github.com --scopes 'repo,read:packages'"
            exit 1
        fi
        
        GITHUB_TOKEN=$(gh auth token)
        log_info "✅ Token refreshed with read:packages scope"
        
        # Test the refreshed token
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            "https://api.github.com/orgs/hipponot/packages?package_type=npm")
    fi
    
    # Final validation
    if [ "$HTTP_CODE" = "403" ]; then
        log_error "GitHub token appears to be rate-limited or invalid (HTTP 403)"
        log_info "This can happen if:"
        log_info "  1. Token is expired - try: gh auth refresh --hostname github.com --scopes 'repo,read:packages'"
        log_info "  2. Rate limit exceeded - wait a few minutes and try again"
        log_info "  3. Token lacks permissions - ensure you have access to @hipponot packages"
        exit 1
    elif [ "$HTTP_CODE" = "401" ]; then
        log_error "GitHub token is invalid or expired (HTTP 401)"
        log_info "Please refresh: gh auth refresh --hostname github.com --scopes 'repo,read:packages'"
        exit 1
    elif [ "$HTTP_CODE" != "200" ]; then
        log_warning "Unexpected response from GitHub API (HTTP $HTTP_CODE)"
        log_info "Proceeding anyway, but build may fail..."
    else
        log_info "✅ Token validated successfully"
    fi
    
    # Export token for Docker build
    export GITHUB_TOKEN
    log_info "✅ GitHub authentication configured for Docker build"
}

# Setup dependency mode based on command line flag
setup_dependencies() {
    log_step "Configuring dependency mode"
    
    # Track if we automatically switched modes
    AUTO_SWITCHED_TO_PUBLISHED=false
    
    if [ "$USE_LOCAL_DEPENDENCIES" = "true" ]; then
        log_info "Using local dependency mode (--local flag specified)"
        DEPENDENCY_MODE="local"
        
        # Verify saga-soa directory exists for local mode
        if [ ! -d "$SAGA_SOA_ROOT" ]; then
            log_error "Local mode requires saga-soa directory as sibling: $SAGA_SOA_ROOT"
            log_error "Please either:"
            log_error "  1. Clone saga-soa as sibling directory: git clone https://github.com/hipponot/saga-soa.git $SAGA_SOA_ROOT"
            log_error "  2. Remove --local flag to use published packages"
            exit 1
        fi
        
        # Switch to local dependencies if needed
        cd "$PROJECT_ROOT"
        if [ -x "./scripts/switch-saga-soa-deps.sh" ]; then
            ./scripts/switch-saga-soa-deps.sh local
            if [ $? -eq 0 ]; then
                log_info "✅ Switched to local dependency mode"
                # Regenerate lockfile after switching dependencies
                log_info "Regenerating lockfile for local dependencies..."
                pnpm install >/dev/null 2>&1
                if [ $? -eq 0 ]; then
                    log_info "✅ Lockfile regenerated successfully"
                else
                    log_error "Failed to regenerate lockfile"
                    exit 1
                fi
            else
                log_error "Failed to switch to local dependency mode"
                exit 1
            fi
        else
            log_warning "switch-saga-soa-deps.sh not found - assuming dependencies are already local"
        fi
    else
        log_info "Using published package mode (default)"
        DEPENDENCY_MODE="published"
        
        # Switch to published mode and setup GitHub auth
        cd "$PROJECT_ROOT"
        if [ -x "./scripts/switch-saga-soa-deps.sh" ]; then
            ./scripts/switch-saga-soa-deps.sh published
            if [ $? -eq 0 ]; then
                log_info "✅ Switched to published package mode"
                # Regenerate lockfile after switching dependencies
                log_info "Regenerating lockfile for published packages..."
                # Add a small delay to avoid rate limiting after dependency switch
                sleep 2
                GITHUB_TOKEN="$GITHUB_TOKEN" pnpm install >/dev/null 2>&1
                if [ $? -eq 0 ]; then
                    log_info "✅ Lockfile regenerated successfully"
                else
                    log_warning "First attempt failed, retrying after delay..."
                    sleep 5
                    GITHUB_TOKEN="$GITHUB_TOKEN" pnpm install >/dev/null 2>&1
                    if [ $? -eq 0 ]; then
                        log_info "✅ Lockfile regenerated on retry"
                    else
                        log_error "Failed to regenerate lockfile after retry"
                        exit 1
                    fi
                fi
            else
                log_error "Failed to switch to published package mode"
                exit 1
            fi
        else
            log_warning "switch-saga-soa-deps.sh not found - assuming dependencies are already published"
        fi
        
        setup_github_auth
    fi
    
    log_info "Dependency mode: $DEPENDENCY_MODE"
}

# Cleanup function (no longer needed with explicit flag-based mode selection)
cleanup_dependencies() {
    # With explicit --local flag, we don't automatically restore dependency modes
    # Users should manually switch modes if needed using ./scripts/switch-saga-soa-deps.sh
    return 0
}

# Function to map environment names to samconfig section names
get_samconfig_env() {
    local env=$1
    local is_ci=$2
    
    if [ "$is_ci" = "true" ]; then
        # Use CI-specific sections for CI/CD deployments
        case "$env" in
            "dev")
                echo "ci-dev"
                ;;
            "qa")
                echo "ci-qa"
                ;;
            "prod")
                echo "ci-prod"
                ;;
            "ephemeral")
                echo "ephemeral"  # Ephemeral already has EcsExecEnabled=true
                ;;
            *)
                log_warning "Unknown CI environment '$env', using ci-$env"
                echo "ci-$env"
                ;;
        esac
    else
        # Use manual deployment sections (will enable ECS Exec)
        case "$env" in
            "dev")
                echo "default"
                ;;
            "qa"|"prod"|"ephemeral")
                echo "$env"
                ;;
            *)
                log_warning "Unknown environment '$env', using as-is"
                echo "$env"
                ;;
        esac
    fi
}

# Function to get the correct stack name for task_connect.sh
get_stack_name() {
    local env=$1
    case "$env" in
        "dev")
            echo "saga-sm-api-fargate"
            ;;
        "qa")
            echo "saga-sm-api-qa-fargate"
            ;;
        "prod")
            echo "saga-sm-api-prod-fargate"
            ;;
        "ephemeral")
            echo "saga-sm-api-ephemeral-{branch_identifier}"
            ;;
        *)
            log_warning "Unknown environment '$env', using saga-sm-api-$env-fargate"
            echo "saga-sm-api-$env-fargate"
            ;;
    esac
}

# Parse command line arguments
USE_LOCAL_DEPENDENCIES="false"

# Check for help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [OPTIONS] [TAG] [ENVIRONMENT] [DEPLOY]"
    echo ""
    echo "OPTIONS:"
    echo "  --local     Use local saga-soa dependencies (requires saga-soa as sibling directory)"
    echo "  --help, -h  Show this help message"
    echo ""
    echo "ARGUMENTS:"
    echo "  TAG         Docker image base tag (default: latest)"
    echo "  ENVIRONMENT Deployment environment: dev|qa|prod|ephemeral (default: dev)"
    echo "  DEPLOY      Whether to deploy after push: true|false (default: true)"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                    # Build latest with published packages, deploy to dev"
    echo "  $0 v1.2.3 qa         # Build v1.2.3 with published packages, deploy to qa"
    echo "  $0 --local v1.2.3    # Build v1.2.3 with local saga-soa, deploy to dev"
    echo "  $0 --local v1.2.3 qa false  # Build v1.2.3 with local saga-soa, push only"
    exit 0
fi

# Check for --local flag
if [ "$1" = "--local" ]; then
    USE_LOCAL_DEPENDENCIES="true"
    shift  # Remove --local from arguments
fi

BASE_TAG=${1:-latest}
ENVIRONMENT=${2:-dev}
DEPLOY=${3:-true}  # Set to false to skip deployment

# Detect if running in CI/CD environment
# Common CI/CD environment variables
if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$GITLAB_CI" ] || [ -n "$JENKINS_HOME" ] || [ -n "$BUILDKITE" ] || [ -n "$CIRCLECI" ] || [ -n "$CODEBUILD_BUILD_ID" ]; then
    IS_CI="true"
    ECS_EXEC_ENABLED="false"
    log_info "Running in CI/CD environment - ECS Exec will be disabled"
else
    IS_CI="false"
    ECS_EXEC_ENABLED="true"
    log_info "Running in local/manual environment - ECS Exec will be enabled for debugging"
fi

# Generate unique deployment tag with timestamp to force CloudFormation changes
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
DEPLOY_TAG="${BASE_TAG}-${TIMESTAMP}"

# Use base tag for local Docker operations, deploy tag for ECR and deployment
TAG=$BASE_TAG

echo "========================================="
echo "🚀 Saga-SM API Build, Push & Deploy"
echo "========================================="
# Setup dependency mode and GitHub authentication
setup_dependencies

echo ""
log_info "Configuration:"
echo "  Image Name:     $IMAGE_NAME"
echo "  Base Tag:       $BASE_TAG"
echo "  Deploy Tag:     $DEPLOY_TAG"
echo "  Environment:    $ENVIRONMENT"
echo "  SAM Config:     $(get_samconfig_env $ENVIRONMENT $IS_CI)"
echo "  Deploy:         $DEPLOY"
echo "  ECS Exec:       $ECS_EXEC_ENABLED (CI/CD: $IS_CI)"
echo "  ECR Repository: $ECR_REPOSITORY"
echo "  API Root:       $API_ROOT"
echo "  Project Root:   $PROJECT_ROOT"  
echo "  Dev Root:       $DEV_ROOT"
echo "  Dependency Mode: $DEPENDENCY_MODE"
if [ "$DEPENDENCY_MODE" = "local" ]; then
    echo "  Saga-SOA Root:  $SAGA_SOA_ROOT"
fi
echo ""

# Set build context based on dependency mode
if [ "$DEPENDENCY_MODE" = "local" ]; then
    # Change to dev root for Docker build (needs both saga-sm and saga-soa)
    BUILD_CONTEXT="$DEV_ROOT"
    DOCKERFILE_PATH="saga-sm/apps/api/Dockerfile.local"
    log_info "Using local dependency mode with Dockerfile.local - building from dev root"
else
    # Change to project root for published packages
    BUILD_CONTEXT="$PROJECT_ROOT"
    DOCKERFILE_PATH="apps/api/Dockerfile"
    log_info "Using published package mode with standard Dockerfile - building from project root"
fi

cd "$BUILD_CONTEXT"

# Step 1: Build the Docker image
log_step "Step 1: Building Docker image ($DEPENDENCY_MODE mode)"
log_info "Building from: $(pwd)"
log_info "Dockerfile: $DOCKERFILE_PATH"

# Pass GitHub token as build arg for published package mode
if [ "$DEPENDENCY_MODE" = "published" ]; then
    log_info "Building with GitHub token for published packages"
    # Refresh the token right before Docker build to ensure it's current
    GITHUB_TOKEN=$(gh auth token 2>/dev/null)
    if [ -z "$GITHUB_TOKEN" ]; then
        log_error "Failed to get GitHub token for Docker build"
        exit 1
    fi
    log_info "Token refreshed for Docker build (starts with: ${GITHUB_TOKEN:0:10}...)"
    docker build -f "$DOCKERFILE_PATH" -t "$IMAGE_NAME:$TAG" --build-arg GITHUB_TOKEN="$GITHUB_TOKEN" .
else
    log_info "Building with local saga-soa dependencies"
    docker build -f "$DOCKERFILE_PATH" -t "$IMAGE_NAME:$TAG" .
fi

if [ $? -eq 0 ]; then
    log_info "✅ Docker image built successfully"
else
    log_error "Docker build failed"
    log_error "Troubleshooting:"
    if [ "$DEPENDENCY_MODE" = "published" ]; then
        log_error "  • Check GitHub token: gh auth status"
        log_error "  • Verify package access: gh auth refresh --hostname github.com --scopes 'repo,read:packages'"
        log_error "  • Check package availability at: https://github.com/orgs/hipponot/packages"
    else
        log_error "  • Ensure saga-soa directory exists: $SAGA_SOA_ROOT"
        log_error "  • Check saga-soa packages are built: cd ../saga-soa && pnpm build"
    fi
    exit 1
fi

# Step 2: Tag for ECR
log_step "Step 2: Tagging image for ECR"
docker tag "$IMAGE_NAME:$TAG" "$ECR_REPOSITORY:$DEPLOY_TAG"
# Also tag as latest if base tag is latest or for convenience
docker tag "$IMAGE_NAME:$TAG" "$ECR_REPOSITORY:latest"

# Step 3: Validate prerequisites and login to ECR
log_step "Step 3: Validating prerequisites and logging into ECR"
check_prerequisites

# Attempt ECR login
log_info "Attempting ECR login..."
if ! aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY 2>/dev/null; then
    log_error "ECR login failed → Check AWS credentials and ECR permissions"
    log_error "Debug: aws sts get-caller-identity && aws ecr describe-repositories --region $AWS_REGION"
    exit 1
fi
log_info "✅ Successfully logged into ECR"

# Step 4: Create ECR repository if it doesn't exist
log_step "Step 4: Ensuring ECR repository exists"
aws ecr describe-repositories --repository-names $IMAGE_NAME --region $AWS_REGION > /dev/null 2>&1
if [ $? -ne 0 ]; then
    log_warning "ECR repository doesn't exist, creating..."
    aws ecr create-repository --repository-name $IMAGE_NAME --region $AWS_REGION
    if [ $? -eq 0 ]; then
        log_info "✅ ECR repository created"
    else
        log_error "Failed to create ECR repository"
        exit 1
    fi
else
    log_info "✅ ECR repository exists"
fi

# Step 5: Push to ECR
log_step "Step 5: Pushing image to ECR"
docker push "$ECR_REPOSITORY:$DEPLOY_TAG"
if [ $? -eq 0 ]; then
    log_info "✅ Deployment image pushed successfully: $ECR_REPOSITORY:$DEPLOY_TAG"
else
    log_error "Docker push failed for deployment tag"
    exit 1
fi

# Also push latest tag for convenience
docker push "$ECR_REPOSITORY:latest"
if [ $? -eq 0 ]; then
    log_info "✅ Latest tag pushed successfully"
else
    log_warning "Failed to push latest tag"
fi

# Step 6: Clean up local images (optional)
log_step "Step 6: Cleaning up local images"
docker rmi "$IMAGE_NAME:$TAG" "$ECR_REPOSITORY:$DEPLOY_TAG" "$ECR_REPOSITORY:latest" >/dev/null 2>&1 || true

# Update samconfig.yaml with new image URI and ECS Exec setting
update_samconfig() {
    local environment=$1
    local new_image_uri=$2
    local enable_ecs_exec=$3
    local samconfig_file="$API_ROOT/samconfig.yaml"
    
    log_info "Updating samconfig.yaml for environment: $environment"
    log_info "Setting ImageId=$new_image_uri"
    log_info "Setting EcsExecEnabled=$enable_ecs_exec"
    
    # Create a backup
    cp "$samconfig_file" "$samconfig_file.backup"
    
    # Update ImageId parameter for the environment
    if sed -i "/^$environment:/,/^[a-zA-Z]/ { /- ImageId=/s|ImageId=.*|ImageId=$new_image_uri|; }" "$samconfig_file"; then
        # Update EcsExecEnabled parameter for the environment
        if sed -i "/^$environment:/,/^[a-zA-Z]/ { /- EcsExecEnabled=/s|EcsExecEnabled=.*|EcsExecEnabled=$enable_ecs_exec|; }" "$samconfig_file"; then
            rm -f "$samconfig_file.backup"
            log_info "✅ Successfully updated samconfig.yaml"
        else
            mv "$samconfig_file.backup" "$samconfig_file"
            log_error "Failed to update EcsExecEnabled in samconfig.yaml"
            return 1
        fi
    else
        mv "$samconfig_file.backup" "$samconfig_file"
        log_error "Failed to update ImageId in samconfig.yaml"
        return 1
    fi
}

# Step 7: Deploy (if requested)
if [ "$DEPLOY" = "true" ]; then
    log_step "Step 7: Deploying to $ENVIRONMENT environment"
    
    # Get the correct samconfig environment name based on CI/CD detection
    SAMCONFIG_ENV=$(get_samconfig_env "$ENVIRONMENT" "$IS_CI")
    log_info "Using samconfig environment: $SAMCONFIG_ENV (CI/CD: $IS_CI)"
    
    # Update samconfig.yaml with new unique image URI and ECS Exec setting
    NEW_IMAGE_URI="$ECR_REPOSITORY:$DEPLOY_TAG"
    log_info "Using unique image URI to force deployment: $NEW_IMAGE_URI"
    
    if ! update_samconfig "$SAMCONFIG_ENV" "$NEW_IMAGE_URI" "$ECS_EXEC_ENABLED"; then
        log_error "Failed to update samconfig.yaml, skipping deployment"
        DEPLOYMENT_STATUS="❌ Config update failed"
    else
        # Deploy using SAM (change to API directory for template.yaml and samconfig.yaml)
        log_info "Deploying with SAM..."
        cd "$API_ROOT"
        
        log_info "Deploying with samconfig environment: $SAMCONFIG_ENV"
        sam deploy --config-env "$SAMCONFIG_ENV"
        
        if [ $? -eq 0 ]; then
            log_info "✅ Deployment successful!"
            DEPLOYMENT_STATUS="✅ Deployed"
        else
            log_error "Deployment failed"
            DEPLOYMENT_STATUS="❌ Deployment failed"
        fi
    fi
else
    log_info "Skipping deployment (DEPLOY=$DEPLOY)"
    DEPLOYMENT_STATUS="⏭️  Skipped"
fi

echo ""
echo "========================================="
echo "✅ Build, Push & Deploy Complete!"
echo "========================================="
echo ""
log_info "🌐 Base Image URI: $ECR_REPOSITORY:latest"
log_info "🚀 Deploy Image URI: $ECR_REPOSITORY:$DEPLOY_TAG"
log_info "📦 Deployment Status: $DEPLOYMENT_STATUS"
echo ""

if [ "$DEPLOY" = "true" ]; then
    if [ "$DEPLOYMENT_STATUS" = "✅ Deployed" ]; then
        echo "🔧 Next Steps:"
        echo "  1. Monitor deployment in AWS Console"
        echo "  2. Test the deployed service endpoints"
        echo "  3. Check service logs if needed"
    else
        echo "🔧 Next Steps:"
        echo "  1. Check deployment logs for errors"
        echo "  2. Verify samconfig.yaml configuration"
        echo "  3. Try manual deployment: sam deploy --config-env $(get_samconfig_env $ENVIRONMENT $IS_CI)"
    fi
else
    echo "🔧 Next Steps:"
    echo "  1. Deploy manually using: sam deploy --config-env $(get_samconfig_env $ENVIRONMENT $IS_CI)"
    echo "  2. Monitor deployment in AWS Console"
    echo "  3. Or run this script with deployment: $0 $BASE_TAG $ENVIRONMENT true"
fi

echo ""
echo "📋 Quick Commands:"
MANUAL_SAMCONFIG_ENV=$(get_samconfig_env $ENVIRONMENT $IS_CI)
echo "  Manual deploy: sam deploy --config-env $MANUAL_SAMCONFIG_ENV"
echo "  Service status: aws ecs describe-services --services saga-sm-api-$ENVIRONMENT"
echo "  Re-run: $0 $BASE_TAG $ENVIRONMENT true"
if [ "$ECS_EXEC_ENABLED" = "true" ]; then
    STACK_NAME=$(get_stack_name $ENVIRONMENT)
    echo "  Connect to container: ./task_connect.sh --stack-name $STACK_NAME --container-name saga-sm-api"
fi
echo ""

if [ "$DEPENDENCY_MODE" = "published" ]; then
    echo "🔧 GitHub Authentication Commands:"
    echo "  Check auth status: gh auth status"
    echo "  Refresh token: gh auth refresh --hostname github.com --scopes 'repo,read:packages'"
    echo "  Switch to local: ../../../scripts/switch-saga-soa-deps.sh local"
    echo ""
fi

log_info "Done! 🎉"
