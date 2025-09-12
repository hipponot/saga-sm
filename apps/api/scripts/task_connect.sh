#!/bin/bash

# ECS Exec Connect Helper Script
# Usage: ./task_connect.sh --stack-name <stack-name> --container-name <container-name> [--task-id <task-id>]

set -e

# Default values
STACK_NAME=""
CONTAINER_NAME=""
TASK_ID=""
REGION="us-west-2"
COMMAND="/bin/sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print usage
usage() {
    echo "Usage: $0 --stack-name <stack-name> --container-name <container-name> [OPTIONS]"
    echo ""
    echo "Connect to an ECS container using ECS Exec"
    echo ""
    echo "Required arguments:"
    echo "  --stack-name      CloudFormation stack name"
    echo "  --container-name  Name of the container to connect to"
    echo ""
    echo "Optional arguments:"
    echo "  --task-id         Specific task ID to connect to (if not provided, will list available tasks)"
    echo "  --region          AWS region (default: us-west-2)"
    echo "  --command         Command to execute (default: /bin/sh)"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --stack-name saga-sm-api-fargate --container-name saga-sm-api"
    echo "  $0 --stack-name saga-sm-api-fargate --container-name postgres --task-id abc123"
    echo "  $0 --stack-name saga-sm-api-ephemeral-feature-xyz --container-name saga-sm-api --command /bin/bash"
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        --container-name)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        --task-id)
            TASK_ID="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --command)
            COMMAND="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            print_color "$RED" "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate required arguments
if [ -z "$STACK_NAME" ]; then
    print_color "$RED" "Error: --stack-name is required"
    usage
fi

if [ -z "$CONTAINER_NAME" ]; then
    print_color "$RED" "Error: --container-name is required"
    usage
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_color "$RED" "Error: AWS CLI is not installed"
    exit 1
fi

# Check if session-manager-plugin is installed (required for ECS Exec)
if ! command -v session-manager-plugin &> /dev/null; then
    print_color "$RED" "Error: session-manager-plugin is not installed"
    echo "Please install it from: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
    exit 1
fi

print_color "$GREEN" "Retrieving stack information for: $STACK_NAME"

# Get cluster ARN from stack resources
CLUSTER_ARN=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "StackResources[?ResourceType=='AWS::ECS::Service'].PhysicalResourceId" \
    --output text 2>/dev/null | head -n1)

if [ -z "$CLUSTER_ARN" ]; then
    print_color "$RED" "Error: Could not find ECS Service in stack $STACK_NAME"
    exit 1
fi

# Extract cluster name from the service ARN
# Service ARN format: arn:aws:ecs:region:account:service/cluster-name/service-name
CLUSTER_NAME=$(echo "$CLUSTER_ARN" | cut -d'/' -f2)
SERVICE_NAME=$(echo "$CLUSTER_ARN" | cut -d'/' -f3)

if [ -z "$CLUSTER_NAME" ] || [ -z "$SERVICE_NAME" ]; then
    print_color "$RED" "Error: Could not extract cluster and service names from ARN"
    exit 1
fi

print_color "$YELLOW" "Cluster: $CLUSTER_NAME"
print_color "$YELLOW" "Service: $SERVICE_NAME"

# If task ID not provided, list available tasks and let user choose
if [ -z "$TASK_ID" ]; then
    print_color "$GREEN" "Fetching running tasks..."
    
    # Get task ARNs for the service
    TASK_ARNS=$(aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --service-name "$SERVICE_NAME" \
        --desired-status RUNNING \
        --region "$REGION" \
        --query "taskArns[]" \
        --output text)
    
    if [ -z "$TASK_ARNS" ]; then
        print_color "$RED" "Error: No running tasks found for service $SERVICE_NAME"
        exit 1
    fi
    
    # Convert to array
    IFS=$'\t' read -ra TASK_ARRAY <<< "$TASK_ARNS"
    
    # If only one task, use it automatically
    if [ ${#TASK_ARRAY[@]} -eq 1 ]; then
        TASK_ARN="${TASK_ARRAY[0]}"
        TASK_ID=$(echo "$TASK_ARN" | rev | cut -d'/' -f1 | rev)
        print_color "$GREEN" "Found one running task: $TASK_ID"
    else
        # Multiple tasks, let user choose
        print_color "$YELLOW" "Multiple tasks found. Please select one:"
        
        # Get task details
        TASK_DETAILS=$(aws ecs describe-tasks \
            --cluster "$CLUSTER_NAME" \
            --tasks $TASK_ARNS \
            --region "$REGION" \
            --query "tasks[].{TaskId:taskArn,StartedAt:startedAt,LastStatus:lastStatus}" \
            --output json)
        
        echo ""
        i=1
        declare -a TASK_IDS
        while IFS= read -r task; do
            task_id=$(echo "$task" | jq -r '.TaskId' | rev | cut -d'/' -f1 | rev)
            started_at=$(echo "$task" | jq -r '.StartedAt')
            status=$(echo "$task" | jq -r '.LastStatus')
            
            TASK_IDS[$i]=$task_id
            echo "  $i) Task: $task_id"
            echo "     Status: $status"
            echo "     Started: $started_at"
            echo ""
            ((i++))
        done < <(echo "$TASK_DETAILS" | jq -c '.[]')
        
        # Prompt for selection
        while true; do
            read -p "Enter task number (1-$((i-1))): " selection
            if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -lt "$i" ]; then
                TASK_ID="${TASK_IDS[$selection]}"
                break
            else
                print_color "$RED" "Invalid selection. Please enter a number between 1 and $((i-1))"
            fi
        done
    fi
else
    print_color "$YELLOW" "Using provided task ID: $TASK_ID"
fi

# Check if ECS Exec is enabled for the task
print_color "$GREEN" "Checking ECS Exec status..."

EXEC_ENABLED=$(aws ecs describe-tasks \
    --cluster "$CLUSTER_NAME" \
    --tasks "$TASK_ID" \
    --region "$REGION" \
    --query "tasks[0].enableExecuteCommand" \
    --output text)

if [ "$EXEC_ENABLED" != "True" ]; then
    print_color "$RED" "Error: ECS Exec is not enabled for this task"
    echo "Make sure the stack was deployed with EcsExecEnabled=true parameter"
    exit 1
fi

# Connect to the container
print_color "$GREEN" "Connecting to container '$CONTAINER_NAME' in task '$TASK_ID'..."
print_color "$YELLOW" "Command: $COMMAND"
echo ""

aws ecs execute-command \
    --cluster "$CLUSTER_NAME" \
    --task "$TASK_ID" \
    --container "$CONTAINER_NAME" \
    --interactive \
    --command "$COMMAND" \
    --region "$REGION"

if [ $? -eq 0 ]; then
    print_color "$GREEN" "Connection closed successfully"
else
    print_color "$RED" "Connection failed or was terminated with an error"
fi