#!/bin/bash

# Setup SSM parameters for saga-sm API deployment
# This script creates the necessary SSM parameters that the CloudFormation template expects

set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-west-2}
ENVIRONMENT=${1:-dev}

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

# Function to create or update SSM parameter
create_parameter() {
    local name=$1
    local value=$2
    local description=$3
    local type=${4:-String}
    
    echo "Setting parameter: $name"
    
    # Check if parameter exists
    if aws ssm get-parameter --name "$name" --region "$AWS_REGION" >/dev/null 2>&1; then
        log_warning "Parameter $name already exists, updating..."
        aws ssm put-parameter \
            --name "$name" \
            --value "$value" \
            --description "$description" \
            --type "$type" \
            --overwrite \
            --region "$AWS_REGION"
    else
        log_info "Creating new parameter: $name"
        aws ssm put-parameter \
            --name "$name" \
            --value "$value" \
            --description "$description" \
            --type "$type" \
            --region "$AWS_REGION"
    fi
}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|qa|prod)$ ]]; then
    log_error "Invalid environment. Must be dev, qa, or prod"
    exit 1
fi

echo "========================================="
echo "🚀 Saga-SM API SSM Parameters Setup"
echo "========================================="
echo ""
log_info "Configuration:"
echo "  Environment:   $ENVIRONMENT"
echo "  AWS Region:    $AWS_REGION"
echo ""

# Check AWS CLI access
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    log_error "AWS CLI not configured or no access. Please configure AWS credentials."
    exit 1
fi

log_info "✅ AWS credentials verified"

# Environment-specific values
case $ENVIRONMENT in
    dev)
        VPC_ID="vpc-010d4178784bbf6f7"
        SUBNETS="subnet-005ff1fefda3dec9c,subnet-065a45775b4452328"
        SECURITY_GROUP="sg-0b0c8a005b6e5819f"
        LOAD_BALANCER_ARN="arn:aws:elasticloadbalancing:us-west-2:531314149529:loadbalancer/app/shared-LoadB-xc1boIqLhjPI/345ab0d98867faff"
        CLUSTER_ARN="arn:aws:ecs:us-west-2:531314149529:cluster/shared-dev-cluster-and-loadbalancer-Cluster-QuyVOhruiTXD"
        ;;
    qa)
        VPC_ID="vpc-010d4178784bbf6f7"  # Update with QA values
        SUBNETS="subnet-005ff1fefda3dec9c,subnet-065a45775b4452328"  # Update with QA values
        SECURITY_GROUP="sg-0b0c8a005b6e5819f"  # Update with QA values
        LOAD_BALANCER_ARN="arn:aws:elasticloadbalancing:us-west-2:531314149529:loadbalancer/app/shared-LoadB-xc1boIqLhjPI/345ab0d98867faff"  # Update with QA values
        CLUSTER_ARN="arn:aws:ecs:us-west-2:531314149529:cluster/shared-dev-cluster-and-loadbalancer-Cluster-QuyVOhruiTXD"  # Update with QA values
        ;;
    prod)
        VPC_ID="vpc-010d4178784bbf6f7"  # Update with Prod values
        SUBNETS="subnet-005ff1fefda3dec9c,subnet-065a45775b4452328"  # Update with Prod values
        SECURITY_GROUP="sg-0b0c8a005b6e5819f"  # Update with Prod values
        LOAD_BALANCER_ARN="arn:aws:elasticloadbalancing:us-west-2:531314149529:loadbalancer/app/shared-LoadB-xc1boIqLhjPI/345ab0d98867faff"  # Update with Prod values
        CLUSTER_ARN="arn:aws:ecs:us-west-2:531314149529:cluster/shared-dev-cluster-and-loadbalancer-Cluster-QuyVOhruiTXD"  # Update with Prod values
        ;;
esac

# Create SSM parameters
log_step "Step 1: Creating/updating SSM parameters for $ENVIRONMENT environment"

create_parameter \
    "/$ENVIRONMENT/app/vpc-id" \
    "$VPC_ID" \
    "VPC ID for $ENVIRONMENT environment"

create_parameter \
    "/$ENVIRONMENT/app/private-subnet-ids" \
    "$SUBNETS" \
    "Private subnet IDs for $ENVIRONMENT environment (comma-separated)" \
    "StringList"

create_parameter \
    "/$ENVIRONMENT/app/app-sg-id" \
    "$SECURITY_GROUP" \
    "Application security group ID for $ENVIRONMENT environment"

create_parameter \
    "/$ENVIRONMENT/app/load-balancer-arn" \
    "$LOAD_BALANCER_ARN" \
    "Application load balancer ARN for $ENVIRONMENT environment"

create_parameter \
    "/$ENVIRONMENT/app/ecs-cluster-arn" \
    "$CLUSTER_ARN" \
    "ECS cluster ARN for $ENVIRONMENT environment"

echo ""
echo "========================================="
echo "✅ SSM Parameters Setup Complete!"
echo "========================================="
echo ""

# Verify parameters
log_step "Step 2: Verifying created parameters"
echo ""

PARAMETERS=(
    "/$ENVIRONMENT/app/vpc-id"
    "/$ENVIRONMENT/app/private-subnet-ids"
    "/$ENVIRONMENT/app/app-sg-id"
    "/$ENVIRONMENT/app/load-balancer-arn"
    "/$ENVIRONMENT/app/ecs-cluster-arn"
)

for param in "${PARAMETERS[@]}"; do
    if VALUE=$(aws ssm get-parameter --name "$param" --region "$AWS_REGION" --query "Parameter.Value" --output text 2>/dev/null); then
        log_info "✅ $param = $VALUE"
    else
        log_error "❌ Failed to retrieve $param"
    fi
done

echo ""
echo "🔧 Next Steps:"
echo "  1. Deploy the API infrastructure:"
echo "     sam deploy --config-env $ENVIRONMENT"
echo ""
echo "  2. Build and push Docker image:"
echo "     ./scripts/build-and-push.sh latest $ENVIRONMENT"
echo ""
echo "  3. Update service with new image if needed:"
echo "     sam deploy --config-env $ENVIRONMENT"
echo ""

log_info "Done! 🎉"
