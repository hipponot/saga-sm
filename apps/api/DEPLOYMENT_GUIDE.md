# Saga-SM API - AWS ECS Deployment Guide

## 📋 TLDR

**Quick Start:**

```bash
# One-time setup per environment
./scripts/setup-ssm-parameters.sh dev

# Build, push, and deploy
./scripts/build-push-deploy.sh v1.0.0 dev
```

**Key Points:**

- 🐳 **Containerized API:** Node.js tRPC API in Docker deployed to ECS Fargate
- 🏗️ **Monorepo Build:** Script builds with saga-soa dependencies from workspace
- 🌐 **Multi-Environment:** dev/qa/prod with separate stacks and SSM parameters
- ⚡ **Auto ECR Management:** Creates ECR repository if needed, handles authentication
- 🔄 **Timestamped Deployments:** Forces CloudFormation updates with unique tags
- 📊 **Load Balancer Integration:** Path-based routing through shared ALB

---

## Overview

This guide covers deploying the Saga-SM API to AWS ECS using SAM templates with SSM Parameter Store integration.

The deployment setup includes:

- **Dockerfile** for containerizing the Node.js tRPC API with monorepo dependencies
- **CloudFormation template** (`template.yaml`) for ECS Fargate infrastructure with SSM parameter integration
- **SAM configuration** (`samconfig.yaml`) for multi-environment deployments
- **Build and push scripts** for Docker image management with workspace support
- **SSM parameter setup scripts** for infrastructure configuration

## Prerequisites

### Required Tools

- **AWS CLI** configured with appropriate credentials
- **SAM CLI** installed for infrastructure deployment
- **Docker** installed and running for container builds
- **Node.js** (v18+) and **pnpm** for monorepo builds
- **Access to ECR** repository (auto-created: `531314149529.dkr.ecr.us-west-2.amazonaws.com/saga-sm-api`)

### Workspace Requirements

- This is a **monorepo** that depends on **saga-soa** packages
- Build requires **workspace structure**: `dev/saga-sm` and `dev/saga-soa` as siblings
- API types must be built first (handled automatically by build script)

## Architecture

The deployment creates:

- **ECS Fargate Service** running the API container
- **Application Load Balancer** integration with path-based routing
- **Target Group** with health checks on `/health` endpoint
- **CloudWatch Logs** for application logging
- **IAM Roles** for ECS task execution and application permissions

## SSM Parameter Store Integration

The template now uses SSM Parameter Store for infrastructure configuration, making it more flexible and environment-aware:

| Parameter         | Path                            | Description                       |
| ----------------- | ------------------------------- | --------------------------------- |
| VPC ID            | `/{env}/app/vpc-id`             | VPC for ECS service               |
| Subnets           | `/{env}/app/private-subnet-ids` | Private subnets (comma-separated) |
| Security Group    | `/{env}/app/app-sg-id`          | Application security group        |
| Load Balancer ARN | `/{env}/app/load-balancer-arn`  | ALB ARN for routing               |
| ECS Cluster ARN   | `/{env}/app/ecs-cluster-arn`    | ECS cluster ARN                   |

## Deployment Process

### 1. Setup SSM Parameters (One-time setup per environment)

```bash
# Setup parameters for development environment
./scripts/setup-ssm-parameters.sh dev

# Setup parameters for QA environment
./scripts/setup-ssm-parameters.sh qa

# Setup parameters for production environment
./scripts/setup-ssm-parameters.sh prod
```

### 2. Build and Deploy

The build script handles the complete process: build, push to ECR, and deploy to ECS.

```bash
# Build, push, and deploy (full process)
./scripts/build-push-deploy.sh [TAG] [ENVIRONMENT] [DEPLOY]

# Examples:
./scripts/build-push-deploy.sh                    # latest → dev (default)
./scripts/build-push-deploy.sh v1.2.3            # v1.2.3 → dev
./scripts/build-push-deploy.sh v1.2.3 qa         # v1.2.3 → qa environment
./scripts/build-push-deploy.sh v1.2.3 qa false   # build + push only, skip deploy
```

#### Deployment Process Details

The script performs these steps:

1. **Workspace Build** - Builds from monorepo root with saga-soa dependencies
2. **Docker Build** - Creates container with API and dependencies
3. **ECR Management** - Auto-creates repository, handles authentication
4. **Timestamped Tagging** - Creates unique deploy tags to force CloudFormation updates
5. **SAM Deployment** - Deploys infrastructure and updates ECS service

### 3. Manual Infrastructure-Only Deployment (Optional)

If you need to deploy infrastructure changes without rebuilding the container:

#### Development Environment

```bash
sam deploy --config-env default    # Maps to 'dev' environment
# or explicitly:
sam deploy --config-env dev
```

#### QA Environment

```bash
sam deploy --config-env qa
```

#### Production Environment

```bash
sam deploy --config-env prod
```

**Note**: The build script typically handles both image builds and infrastructure deployment automatically.

### 4. Verify Deployment

Check service status:

```bash
aws ecs describe-services \
  --cluster arn:aws:ecs:us-west-2:531314149529:cluster/shared-dev-cluster-and-loadbalancer-Cluster-QuyVOhruiTXD \
  --services saga-sm-api
```

Check logs:

```bash
aws logs describe-log-groups --log-group-name-prefix "/ecs/saga-sm-api"
```

## API Endpoints

The API will be available through the shared load balancer with path-based routing:

- **Health Check**: `GET /health`
- **tRPC Endpoints**: `POST /trpc/*`
- **General API**: `/api/*`

### Environment URLs

- **Development**: `https://sm-api.services.dev.wootmath.com/trpc/schedule.getSchedules`
- **QA**: `https://sm-api.services.qa.wootmath.com/trpc/schedule.getSchedules`
- **Production**: `https://sm-api.services.prod.wootmath.com/trpc/schedule.getSchedules`

### Ephemeral Branch URLs

For PR environments, the pattern is:

```
https://sm-api.services.dev.wootmath.com/sm-{branch-identifier}/trpc/schedule.getSchedules
```

Example: PR #123 on branch `feature/user-auth` → `/sm-gh-123-feature-user-auth/trpc/...`

## Environment Configuration

### Environment Variables

The container is configured with:

- `NODE_ENV`: production
- `PORT`: 3000
- `ENVIRONMENT`: dev/qa/prod (from SAM parameter)

### Resource Allocation

- **CPU**: 512 CPU units (0.5 vCPU)
- **Memory**: 1024 MB (1 GB)
- **Port**: 3000

## Health Checks

The service includes multiple layers of health checking:

1. **Docker Health Check**: Internal curl to `/health` endpoint
2. **ECS Health Check**: Container health monitoring
3. **ALB Target Group**: HTTP health checks on `/health`

Health check configuration:

- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Healthy Threshold**: 2
- **Unhealthy Threshold**: 5

## Load Balancer Integration

The service integrates with the shared load balancer using:

- **Path-based routing**: `/trpc/*`, `/health/*`, `/api/*`
- **Priority**: 10 (can be adjusted if conflicts arise)
- **Target Group**: Automatically managed

## Multi-Environment Support

The template supports three environments with separate stacks:

| Environment | Stack Name               | Image Tag | Description |
| ----------- | ------------------------ | --------- | ----------- |
| `dev`       | saga-sm-api-fargate      | latest    | Development |
| `qa`        | saga-sm-api-qa-fargate   | qa        | QA/Testing  |
| `prod`      | saga-sm-api-prod-fargate | prod      | Production  |

## Scaling Configuration

The service is configured with:

- **Desired Count**: 1 (can be increased)
- **Min Healthy**: 50%
- **Max Percent**: 200%

To scale the service:

```bash
aws ecs update-service \
  --cluster <cluster-arn> \
  --service saga-sm-api \
  --desired-count 2
```

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   - Check CloudWatch logs: `/ecs/saga-sm-api`
   - Verify image exists in ECR: `saga-sm-api:latest`
   - Check security group allows port 3000
   - Ensure container has access to required SSM parameters

2. **Docker Build Failures**
   - Verify `saga-soa` directory exists as sibling to `saga-sm`
   - Check workspace structure: `dev/saga-sm` and `dev/saga-soa`
   - Ensure all saga-soa packages are available
   - Run build from correct directory (dev root)

3. **Health Check Failures**
   - Ensure `/health` endpoint is implemented in API
   - Check application is binding to port 3000
   - Verify container health check passes
   - Check if dependencies (DB, external services) are available

4. **Load Balancer Issues**
   - Check listener rule priority conflicts (API uses priority 10)
   - Verify path patterns match your routes (`/trpc/*`, `/health/*`, `/api/*`)
   - Check target group health in ECS console

5. **ECR Authentication Issues**
   - Script handles `aws ecr get-login-password` automatically
   - Check AWS credentials have ECR permissions
   - Verify region is set correctly (us-west-2)

6. **CloudFormation Deployment Failures**
   - Check SSM parameters exist for environment
   - Verify VPC and subnet IDs are correct in SSM
   - Check ECS cluster ARN is valid

### Debug Commands

```bash
# Check service events (replace cluster ARN with actual)
aws ecs describe-services \
  --cluster arn:aws:ecs:us-west-2:531314149529:cluster/shared-dev-cluster \
  --services saga-sm-api

# View current task definition
aws ecs describe-task-definition --task-definition saga-sm-api:1

# Check running tasks
aws ecs list-tasks \
  --cluster arn:aws:ecs:us-west-2:531314149529:cluster/shared-dev-cluster \
  --service-name saga-sm-api

# View recent logs
aws logs tail /ecs/saga-sm-api --follow

# Check SSM parameters for environment
aws ssm get-parameters-by-path --path "/dev/app" --recursive

# Check ECR repository
aws ecr describe-repositories --repository-names saga-sm-api

# List available image tags
aws ecr list-images --repository-name saga-sm-api --query 'imageIds[*].imageTag'
```

### Access Container for Debugging

If needed, you can enable execute command access:

1. Uncomment `EnableExecuteCommand: true` in template.yaml
2. Redeploy the service
3. Access container:
   ```bash
   aws ecs execute-command \
     --cluster <cluster> \
     --task <task-id> \
     --container saga-sm-api \
     --interactive \
     --command "/bin/sh"
   ```

## Cleanup

To remove deployments:

```bash
# Delete development stack
sam delete --stack-name saga-sm-api-fargate

# Delete QA stack
sam delete --stack-name saga-sm-api-qa-fargate

# Delete production stack
sam delete --stack-name saga-sm-api-prod-fargate

# Clean up ECR images (optional - removes ALL images)
aws ecr delete-repository --repository-name saga-sm-api --force

# Or just delete specific tags
aws ecr batch-delete-image \
  --repository-name saga-sm-api \
  --image-ids imageTag=v1.2.3-20241210-143022
```

## Security Notes

- ECS tasks run with minimal IAM permissions
- Container runs as non-root user (`apiuser`)
- Security groups control network access
- CloudWatch logs are encrypted at rest
- ECR images are scanned for vulnerabilities

## Monitoring and Observability

- **CloudWatch Logs**: Application logs in `/ecs/saga-sm-api`
- **ECS Metrics**: CPU, memory, network utilization
- **ALB Metrics**: Request count, latency, error rates
- **Custom Metrics**: Can be added via application code

## Required AWS Permissions

To run the deployment scripts successfully, your AWS credentials need these permissions:

### Core Deployment Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRManagement",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:DescribeRepositories",
        "ecr:CreateRepository",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:ListImages",
        "ecr:BatchDeleteImage",
        "ecr:DeleteRepository"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSDeployment",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:ListTasks",
        "ecs:UpdateService",
        "ecs:RegisterTaskDefinition",
        "ecs:DescribeTasks",
        "ecs:ListTaskDefinitions"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudFormationSAM",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:DescribeStackResources",
        "cloudformation:GetTemplate",
        "cloudformation:ListStacks",
        "cloudformation:ValidateTemplate"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SSMParameterStore",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
        "ssm:PutParameter",
        "ssm:DeleteParameter"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/*/app/*"
    },
    {
      "Sid": "IAMRoleManagement",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:iam::*:role/saga-sm-*",
        "arn:aws:iam::*:role/aws-sam-cli-managed-*"
      ]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:DeleteLogGroup",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:GetLogEvents",
        "logs:FilterLogEvents",
        "logs:StartQuery",
        "logs:StopQuery",
        "logs:GetQueryResults"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3ForSAM",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::aws-sam-cli-managed-*",
        "arn:aws:s3:::aws-sam-cli-managed-*/*"
      ]
    }
  ]
}
```

### Administrative Permissions for Full Setup

If you need to set up SSM parameters and infrastructure from scratch:

```json
{
  "Sid": "InfrastructureSetup",
  "Effect": "Allow",
  "Action": [
    "ec2:DescribeVpcs",
    "ec2:DescribeSubnets",
    "ec2:DescribeSecurityGroups",
    "elasticloadbalancing:DescribeLoadBalancers",
    "elasticloadbalancing:DescribeTargetGroups",
    "elasticloadbalancing:CreateTargetGroup",
    "elasticloadbalancing:DeleteTargetGroup",
    "elasticloadbalancing:CreateListener",
    "elasticloadbalancing:DeleteListener",
    "elasticloadbalancing:ModifyListener"
  ],
  "Resource": "*"
}
```

### Testing Your Permissions

```bash
# Test ECR access
aws ecr describe-repositories --region us-west-2

# Test ECS access
aws ecs list-clusters --region us-west-2

# Test SSM access
aws ssm get-parameters-by-path --path "/dev/app" --region us-west-2

# Test CloudFormation access
aws cloudformation list-stacks --region us-west-2
```

## Support

For deployment issues:

1. Check CloudFormation events in AWS Console
2. Review ECS service events and tasks
3. Examine CloudWatch logs for application errors
4. Verify Docker image builds locally
5. Test API endpoints after successful deployment
6. Verify AWS permissions using the test commands above
