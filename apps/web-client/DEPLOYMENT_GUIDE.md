# Saga-SM Web Client - AWS Amplify Deployment Guide

This guide covers deploying the Saga-SM Web Client to AWS Amplify using AWS SAM and manual deployment scripts.

## Overview

The deployment setup includes:
- **AWS SAM template** (`template.yaml`) for infrastructure setup
- **Deployment script** (`scripts/deploy.sh`) for manual deployments
- **Static export configuration** for Next.js compatibility with Amplify

## Prerequisites

- AWS CLI configured with appropriate credentials
- SAM CLI installed
- Node.js and npm
- `jq` command-line JSON processor
- `zip` utility

## Initial Setup

### 1. Deploy Infrastructure

First, deploy the Amplify infrastructure using SAM:

```bash
# From the web-client directory
sam build
sam deploy --guided
```

During the guided deployment, you'll be prompted to set:
- Stack name: `saga-sm-web-client-infrastructure`
- AWS Region: (e.g., `us-west-2`)
- Parameters:
  - AppName: `saga-sm-web-client`
  - ProjectName: `saga-sm`

### 2. Update GitHub Repository Reference

Edit `template.yaml` and update line 134 to reference your GitHub organization:

```yaml
"token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/saga-sm:*"
```

### 3. Verify SSM Parameters

After deployment, verify the SSM parameters were created:

```bash
aws ssm get-parameter --name "/saga-sm/web-client/amplify/app-id"
aws ssm get-parameter --name "/saga-sm/web-client/amplify/domain"
```

## Manual Deployment

### Quick Start

```bash
# Deploy current branch to dev environment
./scripts/deploy.sh

# Deploy to specific environment
./scripts/deploy.sh --env qa

# Deploy specific branch
./scripts/deploy.sh --branch feature-xyz

# Skip build (use existing build)
./scripts/deploy.sh --skip-build
```

### Branch Mapping

The deployment script automatically maps Git branches to Amplify branches:

- **`main`** → `main` Amplify branch (Production)
- **`develop`** → `develop` Amplify branch (Staging/QA)
- **Feature branches** → Ephemeral branches (auto-created)
- **PR branches** → `pr-{number}` branches

### Environment Configuration

| Environment | Description | Amplify Stage |
|-------------|-------------|---------------|
| `dev` | Development | DEVELOPMENT |
| `qa` | Staging/QA | BETA |
| `prod` | Production | PRODUCTION |

## Build Configuration

The Next.js application is configured for static export to be compatible with Amplify:

```javascript
// next.config.js
const nextConfig = {
    output: 'export',        // Enable static export
    trailingSlash: true,     // Required for Amplify
    images: {
        unoptimized: true,   // Disable image optimization for static export
    },
}
```

## Deployment Process

The deployment script performs these steps:

1. **Configuration Retrieval** - Gets Amplify App ID from SSM
2. **Dependency Installation** - Runs `npm ci` or `npm install`
3. **Application Build** - Builds Next.js app with static export
4. **Branch Management** - Creates/updates Amplify branch if needed
5. **Package Creation** - Creates ZIP from `out/` directory
6. **Upload & Deploy** - Uploads to Amplify and starts deployment
7. **Monitoring** - Waits for deployment completion
8. **Results Display** - Shows deployment URL and details

## Useful Commands

### View Deployment Status

```bash
# Get current deployments
aws amplify list-jobs --app-id <APP_ID> --branch-name <BRANCH>

# Get specific job details
aws amplify get-job --app-id <APP_ID> --branch-name <BRANCH> --job-id <JOB_ID>
```

### Manage Branches

```bash
# List all branches
aws amplify list-branches --app-id <APP_ID>

# Delete ephemeral branch
aws amplify delete-branch --app-id <APP_ID> --branch-name <BRANCH>
```

### SSM Parameters

```bash
# Get all amplify parameters
aws ssm get-parameters-by-path --path "/saga-sm/web-client/amplify"
```

## Troubleshooting

### Common Issues

1. **"Failed to get Amplify App ID"**
   - Ensure infrastructure is deployed: `sam deploy`
   - Check AWS credentials and region

2. **"Failed to get upload URL"**
   - App might have GitHub integration enabled
   - Ensure app was created without repository connection

3. **Build Failures**
   - Check Next.js build locally: `npm run build`
   - Ensure all dependencies are installed

4. **Deployment Timeout**
   - Check deployment logs in AWS Console
   - Verify package size isn't too large

### Debug Mode

```bash
# Enable verbose AWS CLI output
export AWS_CLI_FILE_ENCODING=UTF-8
aws configure set default.cli_pager ""

# Run deployment with debug info
./scripts/deploy.sh --env dev 2>&1 | tee deployment.log
```

## GitHub Actions Integration

The infrastructure creates an IAM role for GitHub Actions deployment. To set up automated deployments:

1. Add these secrets to your GitHub repository:
   ```
   AMPLIFY_APP_ID: (from SSM parameter)
   AWS_ROLE_ARN: (from CloudFormation outputs)
   AWS_REGION: us-west-2
   ```

2. Create a GitHub Actions workflow file in `.github/workflows/deploy.yml`

## Security Notes

- The deployment role has minimal permissions for Amplify operations
- SSM parameters store configuration for cross-environment sharing
- Ephemeral branches should be cleaned up after use
- No sensitive data should be included in the static build

## Support

For deployment issues:
1. Check AWS CloudFormation stack status
2. Verify SSM parameters exist
3. Test AWS CLI access to Amplify
4. Review deployment script logs

## Cleanup

To remove all resources:

```bash
# Delete all branches (except main/develop if needed)
aws amplify list-branches --app-id <APP_ID> --query 'branches[?branchName!=`main` && branchName!=`develop`].branchName' --output text | xargs -I {} aws amplify delete-branch --app-id <APP_ID> --branch-name {}

# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name saga-sm-web-client-infrastructure
```
