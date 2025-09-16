# Saga-SM API - AWS ECS Deployment Guide

This guide covers deploying the Saga-SM API to AWS ECS using SAM templates with SSM Parameter Store integration, based on the session_resource_page reference architecture.

## Overview

The deployment setup includes:
- **Dockerfile** for containerizing the Node.js tRPC API
- **CloudFormation template** (`template.yaml`) for ECS Fargate infrastructure with SSM parameter integration
- **SAM configuration** (`samconfig.yaml`) for multi-environment deployments
- **Build and push scripts** for Docker image management
- **SSM parameter setup scripts** for infrastructure configuration

## Prerequisites

- AWS CLI configured with appropriate credentials
- SAM CLI installed
- Docker installed and running
- Node.js 18+ and npm/pnpm
- Access to ECR repository (531314149529.dkr.ecr.us-west-2.amazonaws.com)

## Architecture

The deployment creates:
- **ECS Fargate Service** running the API container
- **Application Load Balancer** integration with path-based routing
- **Target Group** with health checks on `/health` endpoint
- **CloudWatch Logs** for application logging
- **IAM Roles** for ECS task execution and application permissions

## SSM Parameter Store Integration

The template now uses SSM Parameter Store for infrastructure configuration, making it more flexible and environment-aware:

| Parameter | Path | Description |
|-----------|------|-------------|
| VPC ID | `/{env}/app/vpc-id` | VPC for ECS service |
| Subnets | `/{env}/app/private-subnet-ids` | Private subnets (comma-separated) |
| Security Group | `/{env}/app/app-sg-id` | Application security group |
| Load Balancer ARN | `/{env}/app/load-balancer-arn` | ALB ARN for routing |
| ECS Cluster ARN | `/{env}/app/ecs-cluster-arn` | ECS cluster ARN |

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

### 2. Build and Push Docker Image

```bash
# Build and push to ECR (automatically creates repository if needed)
./scripts/build-and-push.sh [TAG] [ENVIRONMENT]

# Examples:
./scripts/build-and-push.sh latest dev
./scripts/build-and-push.sh v1.0.0 prod
```

### 3. Deploy Infrastructure

#### Development Environment
```bash
sam deploy --config-env default
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

The API will be available through the load balancer with the following routes:

- **Health Check**: `GET /health`
- **tRPC Endpoints**: `POST /trpc/*`
- **General API**: `/api/*`

Example endpoint:
```
https://<load-balancer-dns>/trpc/schedule.getSchedules
```

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

| Environment | Stack Name | Image Tag | Description |
|-------------|------------|-----------|-------------|
| `dev` | saga-sm-api-fargate | latest | Development |
| `qa` | saga-sm-api-qa-fargate | qa | QA/Testing |
| `prod` | saga-sm-api-prod-fargate | prod | Production |

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
   - Verify image exists in ECR
   - Check security group allows port 3000

2. **Health Check Failures**
   - Ensure `/health` endpoint is implemented
   - Check application is binding to port 3000
   - Verify container health check passes

3. **Load Balancer Issues**
   - Check listener rule priority conflicts
   - Verify path patterns match your routes
   - Check target group health

### Debug Commands

```bash
# Check service events
aws ecs describe-services --cluster <cluster> --services saga-sm-api

# View task definition
aws ecs describe-task-definition --task-definition saga-sm-api

# Check running tasks
aws ecs list-tasks --cluster <cluster> --service-name saga-sm-api

# View logs
aws logs get-log-events --log-group-name "/ecs/saga-sm-api" --log-stream-name <stream>

# Check SSM parameters
aws ssm get-parameters-by-path --path "/dev/app" --recursive
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

To remove the deployment:
```bash
# Delete the CloudFormation stack
sam delete --stack-name saga-sm-api-fargate

# Clean up ECR images (optional)
aws ecr delete-repository --repository-name saga-sm-api --force
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

## Support

For deployment issues:
1. Check CloudFormation events in AWS Console
2. Review ECS service events and tasks
3. Examine CloudWatch logs for application errors
4. Verify Docker image builds locally
5. Test API endpoints after successful deployment
