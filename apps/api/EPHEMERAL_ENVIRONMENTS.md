# Ephemeral API Environments

## 📋 TLDR

**How It Works:**

- 🔄 **Auto-deploy** on PR creation (when `apps/api/` files change)
- 🌐 **Unique URLs** like `/sm-gh-123-feature-user-auth/trpc/...`
- 🧹 **Auto-cleanup** when PR is closed/merged
- 📦 **Same build process** as main deployments but with branch-specific naming

**Example Flow:**

1. Open PR #123 on branch `feature/user-auth`
2. Auto-deploys to: `https://sm-api.services.dev.wootmath.com/sm-gh-123-feature-user-auth/trpc/schedule.getSchedules`
3. Test your changes in isolation
4. Close PR → automatically cleaned up

---

This document describes how to use ephemeral environments for the Saga-SM API service, which are automatically created for pull requests and cleaned up when PRs are closed.

## Overview

Ephemeral environments allow you to deploy temporary API instances for feature branches, enabling:

- Testing changes in isolation
- Integration testing with other services
- Demonstrating features to stakeholders
- QA validation before merging to main branches

## How It Works

### Automatic Deployment

When you open a pull request that modifies files in `apps/api/`, the GitHub Actions workflow will:

1. Generate a URL-safe branch identifier (e.g., `gh-123-feature-user-auth`)
2. Deploy a new CloudFormation stack: `saga-sm-api-ephemeral-gh-123-feature-user-auth`
3. Create an ALB listener rule matching path pattern: `/sm-gh-123-feature-user-auth*`
4. Comment on the PR with deployment details and endpoint URL

### Automatic Cleanup

When a pull request is closed (merged or discarded), the cleanup workflow will:

1. Delete the CloudFormation stack
2. Clean up associated S3 deployment artifacts
3. Remove the ALB listener rule

## URL Pattern

Ephemeral environments use path-based routing to avoid DNS complexity:

### Examples

- **Main API**: `https://sm-api.services.dev.wootmath.com/trpc/schedule.getSchedules`
- **PR #123 (feature/user-auth)**: `https://sm-api.services.dev.wootmath.com/sm-gh-123-feature-user-auth/trpc/schedule.getSchedules`
- **PR #456 (bugfix/api-timeout)**: `https://sm-api.services.dev.wootmath.com/sm-gh-456-bugfix-api-timeout/trpc/schedule.getSchedules`

```
https://services.dev.sagasm.com/sm-{branch_identifier}/trpc
```

**Examples:**

- PR #123 from branch `feature/user-auth` → `https://services.dev.sagasm.com/sm-gh-123-feature-user-auth/trpc`
- PR #456 from branch `bugfix/api-error` → `https://services.dev.sagasm.com/sm-gh-456-bugfix-api-error/trpc`

## Testing Your Environment

Once deployed, you can test your ephemeral environment:

```bash
# Health check
curl https://services.dev.sagasm.com/sm-gh-123-feature-branch/health

# tRPC endpoint
curl https://services.dev.sagasm.com/sm-gh-123-feature-branch/trpc
```

## Manual Deployment

You can manually deploy or cleanup ephemeral environments using workflow dispatch:

### Deploy

1. Go to Actions → "Deploy Ephemeral API Environment"
2. Click "Run workflow"
3. Specify branch identifier and image tag (optional)

### Cleanup

1. Go to Actions → "Cleanup Ephemeral API Environment"
2. Click "Run workflow"
3. Specify the branch identifier to cleanup

## Configuration

### Environment Variables

Ephemeral environments use the same configuration as the `dev` environment:

- VPC, subnets, and security groups from `/dev/app/*` SSM parameters
- Load balancer and listener from `/dev/services/*` SSM parameters
- ECS cluster from `/dev/ecs-cluster-arn` SSM parameter

### Resource Naming

All ephemeral resources include the branch identifier in their names:

- ECS Service: `saga-sm-api-{branch_identifier}`
- Target Group: `saga-sm-api-{branch_identifier}-tg`
- IAM Roles: `saga-sm-api-{branch_identifier}-task-role`, `saga-sm-api-{branch_identifier}-execution-role`

### Resource Tags

Ephemeral stacks are tagged for identification and cleanup:

- `Environment: ephemeral`
- `BranchIdentifier: {branch_identifier}`
- `AutoCleanup: true`
- `StackType: ephemeral`

## Troubleshooting

### Deployment Fails

1. Check CloudFormation stack events in AWS Console
2. Verify the Docker image exists in ECR
3. Ensure AWS credentials have proper permissions
4. Check if similar named resources already exist

### Stack Won't Delete

1. Manually delete ECS service in AWS Console (stops tasks)
2. Wait 5-10 minutes for resources to detach
3. Retry stack deletion
4. Check CloudFormation stack events for specific errors

### ALB Priority Conflicts

Ephemeral environments use priority `5`, while permanent environments use priority `10`. If you have many ephemeral environments, you may need to adjust priorities.

## Limits

- Branch identifiers are limited to 63 characters (AWS resource naming limits)
- ALB listener rules have a limit per listener (check your current usage)
- ECS service limits per cluster
- Each ephemeral environment consumes 1 Fargate task

## Security Considerations

- Ephemeral environments use the same security groups as dev
- They have access to the same resources as the dev environment
- Don't use ephemeral environments for production-like data
- Consider implementing additional access controls if needed

## Cost Management

- Ephemeral environments use minimal resources (1 Fargate task)
- Automatic cleanup prevents resource accumulation
- Monitor your AWS costs if you have many concurrent PRs
- Consider implementing time-based cleanup for abandoned environments
