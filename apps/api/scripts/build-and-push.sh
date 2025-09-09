#!/bin/bash

# Build and push Docker image for saga-sm API

set -e

# Configuration
AWS_REGION="us-west-2"
AWS_ACCOUNT_ID="531314149529"
IMAGE_NAME="saga-sm-api"
ECR_REPOSITORY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

# Parse command line arguments
TAG=${1:-latest}
ENVIRONMENT=${2:-dev}

echo "========================================="
echo "🚀 Saga-SM API Docker Build & Push"
echo "========================================="
echo ""
log_info "Configuration:"
echo "  Image Name:    $IMAGE_NAME"
echo "  Tag:           $TAG"
echo "  Environment:   $ENVIRONMENT"
echo "  ECR Repository: $ECR_REPOSITORY"
echo "  Project Root:  $PROJECT_ROOT"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Step 1: Build the Docker image
log_step "Step 1: Building Docker image"
docker build -t "$IMAGE_NAME:$TAG" .
if [ $? -eq 0 ]; then
    log_info "✅ Docker image built successfully"
else
    log_error "Docker build failed"
    exit 1
fi

# Step 2: Tag for ECR
log_step "Step 2: Tagging image for ECR"
docker tag "$IMAGE_NAME:$TAG" "$ECR_REPOSITORY:$TAG"
if [ "$TAG" != "latest" ]; then
    docker tag "$IMAGE_NAME:$TAG" "$ECR_REPOSITORY:latest"
fi

# Step 3: Login to ECR
log_step "Step 3: Logging into ECR"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY
if [ $? -eq 0 ]; then
    log_info "✅ Successfully logged into ECR"
else
    log_error "ECR login failed"
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
docker push "$ECR_REPOSITORY:$TAG"
if [ $? -eq 0 ]; then
    log_info "✅ Image pushed successfully: $ECR_REPOSITORY:$TAG"
else
    log_error "Docker push failed"
    exit 1
fi

if [ "$TAG" != "latest" ]; then
    docker push "$ECR_REPOSITORY:latest"
    if [ $? -eq 0 ]; then
        log_info "✅ Latest tag pushed successfully"
    else
        log_warning "Failed to push latest tag"
    fi
fi

# Step 6: Clean up local images (optional)
log_step "Step 6: Cleaning up local images"
docker rmi "$IMAGE_NAME:$TAG" "$ECR_REPOSITORY:$TAG" > /dev/null 2>&1 || true
if [ "$TAG" != "latest" ]; then
    docker rmi "$ECR_REPOSITORY:latest" > /dev/null 2>&1 || true
fi

echo ""
echo "========================================="
echo "✅ Build and Push Complete!"
echo "========================================="
echo ""
log_info "🌐 Image URI: $ECR_REPOSITORY:$TAG"
echo ""
echo "🔧 Next Steps:"
echo "  1. Update samconfig.yaml with new image URI if needed"
echo "  2. Deploy using: sam deploy --config-env $ENVIRONMENT"
echo "  3. Monitor deployment in AWS Console"
echo ""

# Show useful commands
echo "📋 Useful Commands:"
echo "  # Deploy to specific environment:"
echo "    sam deploy --config-env dev"
echo "    sam deploy --config-env qa" 
echo "    sam deploy --config-env prod"
echo ""
echo "  # Check service status:"
echo "    aws ecs describe-services --cluster <cluster-arn> --services saga-sm-api-$ENVIRONMENT"
echo ""

log_info "Done! 🎉"
