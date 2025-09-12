# Saga-SM Web Client - AWS Amplify Deployment Guide

## 📋 TLDR

**Quick Start:**

```bash
# Deploy current branch to dev
./scripts/deploy.sh

# Deploy feature branch (feature/user-auth → feature-user-auth)
./scripts/deploy.sh --branch feature/user-auth
```

**Key Points:**

- 🏗️ **Monorepo Build:** Script automatically builds API types first, then web client
- 🌐 **Manual Branch Management:** Creates Amplify branches via AWS CLI (no GitHub integration)
- 🔧 **Workspace Aware:** Requires pnpm workspace or Turbo for dependency resolution
- ⚡ **Zero Config:** Retrieves all settings from AWS SSM Parameter Store
- 🧹 **Self-Contained:** Handles dependencies, builds, and deployments via AWS commands
- 📏 **Branch Normalization:** `/` becomes `-`, max 63 chars for Amplify compatibility
- 📦 **Direct Upload:** Creates ZIP packages and uploads directly to Amplify S3

---

## Overview

This guide covers deploying the Saga-SM Web Client to AWS Amplify using AWS SAM and manual deployment scripts.

The deployment setup includes:

- **AWS SAM template** (`template.yaml`) for infrastructure setup
- **Manual deployment script** (`scripts/deploy.sh`) using AWS CLI commands (no GitHub integration)
- **Static export configuration** for Next.js compatibility with Amplify
- **Monorepo integration** with automatic API types dependency building
- **Direct S3 upload** via Amplify deployment APIs

## Prerequisites

### Required Tools

- **AWS CLI** configured with appropriate credentials
- **SAM CLI** installed for infrastructure deployment
- **Node.js** (v18+) and **npm**
- **pnpm** (recommended) or **Turbo** for monorepo builds
- **jq** command-line JSON processor
- **zip** utility

### Workspace Requirements

- This is a **monorepo** that requires workspace dependency management
- The web client depends on `@saga-sm/api-types` which must be built first
- Script supports **Turbo** (preferred) or **pnpm workspace** for builds

## Initial Setup

### 1. Deploy Infrastructure

First, deploy the Amplify infrastructure using SAM. This creates an Amplify app **without GitHub integration** for manual deployments:

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

**Important**: The SAM template creates an Amplify app configured for manual deployment (no repository connection). This allows us to use AWS CLI commands for deployment control.

### 2. Update GitHub Repository Reference

Edit `template.yaml` and update line 134 to reference your GitHub organization:

```yaml
'token.actions.githubusercontent.com:sub': 'repo:YOUR_GITHUB_ORG/saga-sm:*'
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

# Deploy specific branch (feature/user-auth → feature-user-auth)
./scripts/deploy.sh --branch feature/user-auth

# Skip build (use existing build)
./scripts/deploy.sh --skip-build

# Skip dependencies (use existing node_modules)
./scripts/deploy.sh --skip-install

# Non-interactive mode (skip all "Proceed?" prompts)
./scripts/deploy.sh --force

# Clean Turbo cache and force rebuild
./scripts/deploy.sh --clean-cache

# Combine flags for CI/CD (most common)
./scripts/deploy.sh --env qa --force

# CI/CD with fresh build (bypass all caching)
./scripts/deploy.sh --env qa --force --clean-cache
```

### Command Line Options

| Flag              | Description                            | Use Case                                |
| ----------------- | -------------------------------------- | --------------------------------------- |
| `--env ENV`       | Build environment (dev/qa/prod)        | Target specific environment             |
| `--branch BRANCH` | Custom branch name                     | Deploy feature branches                 |
| `--skip-build`    | Use existing build output              | Quick re-deploys                        |
| `--skip-install`  | Use existing node_modules              | When dependencies haven't changed       |
| `--force`         | Non-interactive mode + force reinstall | **Essential for CI/CD pipelines**       |
| `--clean-cache`   | Clean Turbo cache before building      | Force rebuild when caching issues occur |

**CI/CD Usage**: Always use `--force` in automated environments to skip interactive prompts and force dependency reinstalls:

```bash
./scripts/deploy.sh --env qa --force
```

**What `--force` does:**

- Skips browser opening prompt
- Forces pnpm to reinstall dependencies without confirmation (`pnpm install --force`)
- Ensures fully non-interactive operation for CI/CD

### Turborepo Optimizations

The deployment script is optimized for Turborepo with intelligent caching:

**🎯 Smart Caching:**

- Preserves Turbo cache by default for faster rebuilds
- Only rebuilds packages that have changed (using `turbo run build --filter`)
- Automatically detects and skips unchanged dependencies

**⚡ Performance Features:**

- **Cache hit detection**: Shows when nothing needs rebuilding
- **Dependency auto-resolution**: Turbo handles `@saga-sm/api-types` dependency automatically
- **Remote caching support**: Set `TURBO_TOKEN` and `TURBO_TEAM` for team caching

**🧹 Cache Management:**

```bash
# Force clean rebuild (troubleshooting)
./scripts/deploy.sh --clean-cache

# Preserve cache for speed (default)
./scripts/deploy.sh

# Check if build is needed without building
turbo run build --filter="@saga-sm/web-client" --dry
```

**Environment Variables for Remote Caching:**

```bash
# Set these for Turbo remote caching (optional)
export TURBO_TOKEN="your-turbo-token"
export TURBO_TEAM="your-team-name"

# The script will automatically detect and use remote caching
./scripts/deploy.sh --env qa --force
```

### Branch Mapping

The deployment script **manually creates and manages** Amplify branches using AWS CLI commands (no GitHub integration):

- **`main`** → `main` Amplify branch (Production)
    - URL: `https://main.d2jpp1ywz4pb1c.amplifyapp.com`
- **`develop`** → `develop` Amplify branch (Staging/QA)
    - URL: `https://develop.d2jpp1ywz4pb1c.amplifyapp.com`
- **Feature branches** → Ephemeral branches (auto-created)
    - `feature/user-auth` → `feature-user-auth`
        - URL: `https://feature-user-auth.d2jpp1ywz4pb1c.amplifyapp.com`
    - `bugfix/api-timeout` → `bugfix-api-timeout`
        - URL: `https://bugfix-api-timeout.d2jpp1ywz4pb1c.amplifyapp.com`
    - `feature/SAGA-123-dashboard` → `feature-SAGA-123-dashboard`
        - URL: `https://feature-SAGA-123-dashboard.d2jpp1ywz4pb1c.amplifyapp.com`
- **PR branches** → `pr-{number}` branches
    - PR #45 → `pr-45`
        - URL: `https://pr-45.d2jpp1ywz4pb1c.amplifyapp.com`

### Branch Name Normalization Rules

- **Slashes replaced**: `/` becomes `-`
- **Length limit**: Max 63 characters for Amplify branch names
- **Case preserved**: `feature/SAGA-123-Dashboard` → `feature-SAGA-123-Dashboard`
- **Underscores to hyphens in URLs**: Amplify converts `_` to `-` in the final URL

### Environment Configuration

| Environment | Description | Amplify Stage |
| ----------- | ----------- | ------------- |
| `dev`       | Development | DEVELOPMENT   |
| `qa`        | Staging/QA  | BETA          |
| `prod`      | Production  | PRODUCTION    |

## Build Configuration

### Next.js Static Export

The Next.js application is configured for static export to be compatible with Amplify:

```javascript
// next.config.js
const nextConfig = {
    output: 'export', // Enable static export
    trailingSlash: true, // Required for Amplify
    images: {
        unoptimized: true, // Disable image optimization for static export
    },
}
```

### Monorepo Build Dependencies

The build process requires these packages to be built in order:

1. **`@saga-sm/api-types`** - Generates TypeScript definitions from tRPC routers
2. **`@saga-sm/web-client`** - Consumes the API types for type-safe API calls

The deployment script automatically handles this dependency chain using:

- **Turbo** (preferred): `turbo run build --filter="@saga-sm/web-client"`
- **pnpm workspace**: Manual build order with workspace linking refresh

## Deployment Process

The deployment script performs these steps:

1. **AWS Configuration Check** - Validates credentials and connectivity
2. **Configuration Retrieval** - Gets Amplify App ID and domain from SSM
3. **Workspace Dependencies** - Installs dependencies using pnpm workspace
4. **API Types Build** - Builds `@saga-sm/api-types` package first
5. **Workspace Refresh** - Updates symlinks to include built packages
6. **Web Client Build** - Builds Next.js app with static export
7. **Branch Management** - Creates/updates Amplify branch if needed
8. **Package Creation** - Creates ZIP from `out/` directory
9. **Manual Deployment Creation** - Uses `aws amplify create-deployment` (no GitHub)
10. **Direct Upload** - Uses `curl` to upload ZIP to Amplify S3 bucket
11. **Deployment Start** - Uses `aws amplify start-deployment` to trigger build
12. **Monitoring** - Waits for deployment completion with progress updates
13. **Results Display** - Shows deployment URL and helpful commands

### Build Process Details

The script uses a tiered approach for builds:

**Tier 1: Turbo (Preferred)**

```bash
turbo run build --filter="@saga-sm/web-client"
```

- Automatically resolves dependencies via `turbo.json`
- Builds API types first, then web client
- Caches builds for performance

**Tier 2: pnpm Workspace**

```bash
pnpm --filter="@saga-sm/api-types" run build
pnpm install --ignore-scripts  # Refresh workspace links
pnpm --filter="@saga-sm/web-client" run build
```

- Manual dependency order management
- Explicit workspace link refresh after API types build

### Manual Deployment Process

Unlike Amplify's GitHub integration, we use **explicit AWS CLI commands**:

```bash
# Create deployment (returns upload URL)
aws amplify create-deployment --app-id $APP_ID --branch-name $BRANCH

# Upload static files directly
curl -X PUT $UPLOAD_URL --data-binary @deploy.zip

# Start deployment manually
aws amplify start-deployment --app-id $APP_ID --branch-name $BRANCH
```

This approach gives us:

- **Full control** over build process and timing
- **Monorepo compatibility** with proper dependency builds
- **No GitHub webhook dependencies** or repository access requirements
- **Explicit error handling** at each deployment step

## Useful Commands

### View Deployment Status

```bash
# Get current deployments (ephemeral branch example)
aws amplify list-jobs --app-id d2jpp1ywz4pb1c --branch-name feature-user-auth

# Get specific job details
aws amplify get-job --app-id d2jpp1ywz4pb1c --branch-name feature-user-auth --job-id 7
```

### Manage Branches

```bash
# List all branches
aws amplify list-branches --app-id d2jpp1ywz4pb1c

# Delete ephemeral branch examples
aws amplify delete-branch --app-id d2jpp1ywz4pb1c --branch-name feature-user-auth
aws amplify delete-branch --app-id d2jpp1ywz4pb1c --branch-name pr-45
```

### SSM Parameters

```bash
# Get all amplify parameters
aws ssm get-parameters-by-path --path "/saga-sm/web-client/amplify"
```

## Troubleshooting

### Silent Deployment Failures

**Symptom**: Script stops at "Step 6: Deploying to Amplify" without error or success message.

**Root Cause**: Missing `amplify:CreateDeployment` permission causes silent AWS CLI failure.

**Solution**:

1. Run permission verification commands above
2. Apply the full AWS permissions policy
3. Re-run deployment with: `./scripts/deploy.sh --env dev --skip-build`

**Prevention**: Always run permission tests before first deployment.

### Common Issues

1. **"Failed to get Amplify App ID"**
    - Ensure infrastructure is deployed: `sam deploy`
    - Check AWS credentials and region

2. **"Cannot find module '@saga-sm/api-types'"**
    - API types not built before web client
    - Solution: Script automatically handles this, but ensure workspace setup is correct
    - Manual fix: `cd ../../ && pnpm --filter="@saga-sm/api-types" run build`

3. **"Neither turbo nor pnpm workspace detected"**
    - Script requires monorepo workspace tools
    - Ensure `pnpm-workspace.yaml` exists in workspace root
    - Install turbo: `npm install -g turbo` or use pnpm

4. **"Failed to get upload URL"**
    - App might have GitHub integration enabled (conflicts with manual deployment)
    - Ensure Amplify app was created **without repository connection**
    - Manual deployment requires apps to be created with "Deploy without Git provider"

5. **Build Failures**
    - Check dependencies are installed: `pnpm install` from workspace root
    - Verify API types build: `pnpm --filter="@saga-sm/api-types" run build`
    - Test Next.js build locally: `npm run build`

6. **Workspace Link Issues**
    - Symlinks may be broken after builds
    - Solution: Script automatically runs `pnpm install --ignore-scripts` to refresh
    - Manual fix: Run from workspace root: `pnpm install`

7. **Long Branch Names Truncated**
    - Branch names are limited to 63 characters for Amplify
    - Example: `feature/very-long-branch-name-that-exceeds-the-amplify-limit` becomes `feature-very-long-branch-name-that-exceeds-the-amplify-limi`
    - Solution: Use shorter, descriptive branch names

8. **Deployment Timeout**
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

## GitHub Actions Integration (Optional)

The infrastructure creates an IAM role for optional GitHub Actions deployment. However, the primary deployment method is the **manual script** using AWS CLI commands.

For GitHub Actions automation (optional):

1. Add these secrets to your GitHub repository:

    ```
    AMPLIFY_APP_ID: (from SSM parameter)
    AWS_ROLE_ARN: (from CloudFormation outputs)
    AWS_REGION: us-west-2
    ```

2. Create a GitHub Actions workflow that calls the deployment script:
    ```yaml
    - name: Deploy to Amplify
      run: ./scripts/deploy.sh --env ${{ matrix.environment }}
    ```

**Note**: GitHub Actions would still use the same manual deployment approach (AWS CLI commands), not Amplify's built-in GitHub integration.

## Security Notes

- The deployment role has minimal permissions for Amplify operations
- SSM parameters store configuration for cross-environment sharing
- Ephemeral branches should be cleaned up after use
- No sensitive data should be included in the static build

## Required AWS Permissions

⚠️ **Critical**: Insufficient permissions cause silent deployment failures. Always verify permissions before deploying.

To run the deployment scripts successfully, your AWS credentials need these permissions:

### Core Deployment Permissions

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AmplifyManagement",
            "Effect": "Allow",
            "Action": [
                "amplify:GetApp",
                "amplify:ListApps",
                "amplify:CreateApp",
                "amplify:DeleteApp",
                "amplify:UpdateApp",
                "amplify:GetBranch",
                "amplify:ListBranches",
                "amplify:CreateBranch",
                "amplify:DeleteBranch",
                "amplify:UpdateBranch",
                "amplify:CreateDeployment",
                "amplify:StartDeployment",
                "amplify:GetJob",
                "amplify:ListJobs",
                "amplify:StopJob"
            ],
            "Resource": "*"
        },
        {
            "Sid": "S3ForAmplifyDeployment",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::amplify-*",
                "arn:aws:s3:::amplify-*/*",
                "arn:aws:s3:::aws-sam-cli-managed-*",
                "arn:aws:s3:::aws-sam-cli-managed-*/*"
            ]
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
            "Resource": [
                "arn:aws:ssm:*:*:parameter/saga-sm/web-client/*",
                "arn:aws:ssm:*:*:parameter/*/amplify/*"
            ]
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
                "iam:PassRole",
                "iam:CreateOpenIDConnectProvider",
                "iam:DeleteOpenIDConnectProvider",
                "iam:GetOpenIDConnectProvider"
            ],
            "Resource": [
                "arn:aws:iam::*:role/saga-sm-*",
                "arn:aws:iam::*:role/aws-sam-cli-managed-*",
                "arn:aws:iam::*:oidc-provider/token.actions.githubusercontent.com"
            ]
        }
    ]
}
```

### 🔍 Permission Verification (Required Before First Deployment)

**Always test these commands before running deployment scripts** to avoid silent failures:

```bash
# Test core AWS access
aws sts get-caller-identity

# Test SSM parameter access
aws ssm get-parameter --name "/saga-sm/web-client/amplify/app-id" --region us-west-2

# Test Amplify app access
aws amplify get-app --app-id d2jpp1ywz4pb1c --region us-west-2

# ⚠️ CRITICAL: Test deployment creation (this is where most failures occur)
aws amplify create-deployment --app-id d2jpp1ywz4pb1c --branch-name test-permissions --region us-west-2
```

**Expected Results:**

- ✅ `get-caller-identity`: Shows your AWS account and role
- ✅ `get-parameter`: Returns the Amplify app ID
- ✅ `get-app`: Returns app details
- ✅ `create-deployment`: Returns `zipUploadUrl` and `jobId` (this confirms deployment permissions)

**If any command fails:**

1. Contact your AWS administrator to apply the permissions policy above
2. Verify you're using the correct AWS profile: `aws configure list`
3. Check if your SSO session is expired: `aws sso login`

### Infrastructure Setup Permissions

For initial infrastructure deployment (SAM template):

```json
{
    "Sid": "AmplifyInfrastructure",
    "Effect": "Allow",
    "Action": [
        "amplify:CreateDomainAssociation",
        "amplify:DeleteDomainAssociation",
        "amplify:GetDomainAssociation",
        "amplify:ListDomainAssociations",
        "amplify:CreateBackendEnvironment",
        "amplify:DeleteBackendEnvironment",
        "amplify:GetBackendEnvironment",
        "amplify:ListBackendEnvironments"
    ],
    "Resource": "*"
}
```

### Minimum Permissions for Script Operation

If you only need to deploy to existing infrastructure (not create it):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DeploymentOnly",
            "Effect": "Allow",
            "Action": [
                "amplify:GetApp",
                "amplify:GetBranch",
                "amplify:CreateBranch",
                "amplify:CreateDeployment",
                "amplify:StartDeployment",
                "amplify:GetJob",
                "ssm:GetParameter",
                "s3:PutObject"
            ],
            "Resource": "*"
        }
    ]
}
```

### Testing Your Permissions

```bash
# Test Amplify access
aws amplify list-apps --region us-west-2

# Test SSM access
aws ssm get-parameter --name "/saga-sm/web-client/amplify/app-id" --region us-west-2

# Test CloudFormation access (for infrastructure)
aws cloudformation list-stacks --region us-west-2

# Test S3 upload capability (replace with actual app ID)
aws amplify create-deployment --app-id d2jpp1ywz4pb1c --branch-name test-permissions --region us-west-2
```

### GitHub Actions Permissions

If using GitHub Actions, the OIDC role needs these additional permissions:

```json
{
    "Sid": "GitHubActionsOIDC",
    "Effect": "Allow",
    "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
        "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
            "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/saga-sm:*"
        }
    }
}
```

## Support

For deployment issues:

1. Check AWS CloudFormation stack status
2. Verify SSM parameters exist
3. Test AWS CLI access to Amplify
4. Review deployment script logs
5. Verify AWS permissions using the test commands above

## Cleanup

To remove all resources:

```bash
# Delete all ephemeral branches (except main/develop)
aws amplify list-branches --app-id d2jpp1ywz4pb1c --query 'branches[?branchName!=`main` && branchName!=`develop`].branchName' --output text | xargs -I {} aws amplify delete-branch --app-id d2jpp1ywz4pb1c --branch-name {}

# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name saga-sm-web-client-infrastructure
```
