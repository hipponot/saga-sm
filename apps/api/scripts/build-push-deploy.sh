#!/bin/bash

# Build, push, and optionally deploy Docker image for saga-sm API
#
# Usage: ./build-push-deploy.sh [TAG] [ENVIRONMENT] [DEPLOY]
#   TAG         - Docker image base tag (default: latest)
#   ENVIRONMENT - Deployment environment: dev|qa|prod|ephemeral (default: dev)  
#   DEPLOY      - Whether to deploy after push: true|false (default: true)
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
#   ./build-push-deploy.sh                    # Build latest, deploy to dev
#   ./build-push-deploy.sh v1.2.3             # Build v1.2.3, deploy to dev
#   ./build-push-deploy.sh v1.2.3 qa          # Build v1.2.3, deploy to qa
#   ./build-push-deploy.sh v1.2.3 qa false    # Build v1.2.3, push to ECR, skip deploy
#   AWS_PROFILE=prod ./build-push-deploy.sh v1.2.3 prod  # Deploy to prod with specific AWS profile

set -e

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

# Function to map environment names to samconfig section names
get_samconfig_env() {
    local env=$1
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
}

# Parse command line arguments
BASE_TAG=${1:-latest}
ENVIRONMENT=${2:-dev}
DEPLOY=${3:-true}  # Set to false to skip deployment

# Generate unique deployment tag with timestamp to force CloudFormation changes
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
DEPLOY_TAG="${BASE_TAG}-${TIMESTAMP}"

# Use base tag for local Docker operations, deploy tag for ECR and deployment
TAG=$BASE_TAG

echo "========================================="
echo "🚀 Saga-SM API Build, Push & Deploy"
echo "========================================="
echo ""
log_info "Configuration:"
echo "  Image Name:     $IMAGE_NAME"
echo "  Base Tag:       $BASE_TAG"
echo "  Deploy Tag:     $DEPLOY_TAG"
echo "  Environment:    $ENVIRONMENT"
echo "  SAM Config:     $(get_samconfig_env $ENVIRONMENT)"
echo "  Deploy:         $DEPLOY"
echo "  ECR Repository: $ECR_REPOSITORY"
echo "  API Root:       $API_ROOT"
echo "  Project Root:   $PROJECT_ROOT"  
echo "  Dev Root:       $DEV_ROOT"
echo "  Saga-SOA Root:  $SAGA_SOA_ROOT"
echo ""

# Verify saga-soa exists
if [ ! -d "$SAGA_SOA_ROOT" ]; then
    log_error "Saga-SOA directory not found at: $SAGA_SOA_ROOT"
    log_error "Please ensure saga-soa is available as a sibling directory"
    exit 1
fi

# Change to dev root for Docker build (needs both saga-sm and saga-soa)
cd "$DEV_ROOT"

# Step 1: Build the Docker image
log_step "Step 1: Building Docker image (from dev root with saga-soa)"
log_info "Building from: $(pwd)"
log_info "Dockerfile: saga-sm/apps/api/Dockerfile"
docker build -f saga-sm/apps/api/Dockerfile -t "$IMAGE_NAME:$TAG" .
if [ $? -eq 0 ]; then
    log_info "✅ Docker image built successfully"
else
    log_error "Docker build failed"
    exit 1
fi

# Step 2: Tag for ECR
log_step "Step 2: Tagging image for ECR"
docker tag "$IMAGE_NAME:$TAG" "$ECR_REPOSITORY:$DEPLOY_TAG"
# Also tag as latest if base tag is latest or for convenience
docker tag "$IMAGE_NAME:$TAG" "$ECR_REPOSITORY:latest"

# Step 3: Validate prerequisites and login to ECR
log_step "Step 3: Validating prerequisites and logging into ECR"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed or not in PATH"
    echo ""
    echo "📋 To install AWS CLI:"
    echo "  curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o \"awscliv2.zip\""
    echo "  unzip awscliv2.zip"
    echo "  sudo ./aws/install"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    log_error "Docker is not running or not accessible"
    echo ""
    echo "📋 To start Docker:"
    echo "  sudo systemctl start docker"
    echo "  # Or if using Docker Desktop, start the application"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured or insufficient permissions"
    echo ""
    echo "📋 To configure AWS credentials:"
    echo "  aws configure"
    echo "  # Or set environment variables:"
    echo "  export AWS_ACCESS_KEY_ID=your_access_key"
    echo "  export AWS_SECRET_ACCESS_KEY=your_secret_key"
    echo "  export AWS_DEFAULT_REGION=$AWS_REGION"
    echo ""
    echo "📋 Required IAM permissions:"
    echo "  - ecr:GetAuthorizationToken"
    echo "  - ecr:BatchCheckLayerAvailability"  
    echo "  - ecr:GetDownloadUrlForLayer"
    echo "  - ecr:BatchGetImage"
    echo "  - ecr:DescribeRepositories"
    echo "  - ecr:CreateRepository (if repository doesn't exist)"
    echo "  - ecr:InitiateLayerUpload"
    echo "  - ecr:UploadLayerPart"
    echo "  - ecr:CompleteLayerUpload"
    echo "  - ecr:PutImage"
    exit 1
fi

# Attempt ECR login
log_info "Attempting ECR login..."
if aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY 2>/dev/null; then
    log_info "✅ Successfully logged into ECR"
else
    log_error "ECR login failed"
    echo ""
    echo "📋 Troubleshooting ECR login:"
    echo "  1. Verify your AWS credentials:"
    echo "     aws sts get-caller-identity"
    echo ""
    echo "  2. Check if you have ECR permissions:"
    echo "     aws ecr describe-repositories --region $AWS_REGION"
    echo ""
    echo "  3. Manually test ECR login:"
    echo "     aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY"
    echo ""
    echo "  4. If using MFA, ensure your session token is valid:"
    echo "     aws sts get-session-token --duration-seconds 3600"
    echo ""
    echo "  5. For cross-account access, verify assume role permissions"
    exit 1
fi

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
docker rmi "$IMAGE_NAME:$TAG" "$ECR_REPOSITORY:$DEPLOY_TAG" "$ECR_REPOSITORY:latest" > /dev/null 2>&1 || true

# Function to update samconfig.yaml with new image URI
update_samconfig() {
    local environment=$1
    local new_image_uri=$2
    local samconfig_file="$API_ROOT/samconfig.yaml"
    
    log_info "Updating samconfig.yaml for environment: $environment"
    
    # Create a backup of the current samconfig.yaml
    cp "$samconfig_file" "$samconfig_file.backup"
    
    # Update the ImageId parameter for the specified environment
    sed -i "/^$environment:/,/^[a-zA-Z]/ { /- ImageId=/s|ImageId=.*|ImageId=$new_image_uri|; }" "$samconfig_file"
    
    if [ $? -eq 0 ]; then
        log_info "✅ Successfully updated samconfig.yaml"
    else
        log_error "Failed to update samconfig.yaml"
        # Restore backup
        mv "$samconfig_file.backup" "$samconfig_file"
        return 1
    fi
    
    # Clean up backup
    rm -f "$samconfig_file.backup"
    return 0
}

# Step 7: Deploy (if requested)
if [ "$DEPLOY" = "true" ]; then
    log_step "Step 7: Deploying to $ENVIRONMENT environment"
    
    # Get the correct samconfig environment name
    SAMCONFIG_ENV=$(get_samconfig_env "$ENVIRONMENT")
    log_info "Using samconfig environment: $SAMCONFIG_ENV"
    
    # Update samconfig.yaml with new unique image URI to force CloudFormation update
    NEW_IMAGE_URI="$ECR_REPOSITORY:$DEPLOY_TAG"
    log_info "Using unique image URI to force deployment: $NEW_IMAGE_URI"
    
    if ! update_samconfig "$SAMCONFIG_ENV" "$NEW_IMAGE_URI"; then
        log_error "Failed to update samconfig.yaml, skipping deployment"
        DEPLOYMENT_STATUS="❌ Config update failed"
    else
        # Deploy using SAM (change to API directory for template.yaml and samconfig.yaml)
        log_info "Deploying with SAM..."
        cd "$API_ROOT"
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
        echo "  3. Try manual deployment: sam deploy --config-env $SAMCONFIG_ENV"
    fi
else
    echo "🔧 Next Steps:"
    echo "  1. Deploy manually using: sam deploy --config-env $(get_samconfig_env $ENVIRONMENT)"
    echo "  2. Monitor deployment in AWS Console"
    echo "  3. Or run this script with deployment: $0 $BASE_TAG $ENVIRONMENT true"
fi

echo ""

# Show useful commands
echo "📋 Useful Commands:"
echo "  # Manual deployment to specific environment:"
echo "    sam deploy --config-env default  # for dev environment"
echo "    sam deploy --config-env qa" 
echo "    sam deploy --config-env prod"
echo ""
echo "  # Check service status:"
echo "    aws ecs describe-services --cluster <cluster-arn> --services saga-sm-api-$ENVIRONMENT"
echo ""
echo "  # Build and deploy in one command:"
echo "    $0 <tag> <environment> <deploy:true|false>"
echo "    Example: $0 v1.2.3 qa true"
echo ""
echo "  # Note: Deployment uses timestamped tags to force CloudFormation updates"
echo "    Base tag 'v1.2.3' becomes 'v1.2.3-20241210-143022' for deployment"
echo "    This ensures ECS service redeploys even with same base image"
echo ""

log_info "Done! 🎉"
