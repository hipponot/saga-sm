# Environment Variable Management for Amplify Hosting

## 📋 TLDR

**Key Environment Variables:**
- `NEXT_PUBLIC_SAGA_SM_API_URL` - API endpoint (auto-configured from SSM)
- `BUILD_ENV` - Environment (`dev`/`qa`/`prod`) 

**How It Works:**
- 🔧 Deploy script reads API URLs from **SSM Parameter Store**
- 🌐 Environment-specific URLs set automatically based on `--env` flag
- 📦 Build environment variables injected during deployment
- ⚡ **Zero manual configuration** required - all automated

**SSM Parameters:**
```bash
/saga-sm/web-client/api-url/dev    # Used by feature branches
/saga-sm/web-client/api-url/qa     # Used by develop branch  
/saga-sm/web-client/api-url/prod   # Used by main branch
```

**Realistic URL Examples:**
```bash
# Ephemeral branch URLs (auto-generated)
https://feature-user-auth.d2jpp1ywz4pb1c.amplifyapp.com
https://bugfix-api-timeout.d2jpp1ywz4pb1c.amplifyapp.com  
https://pr-45.d2jpp1ywz4pb1c.amplifyapp.com
```

---

This document explains how environment variables are managed across different environments in your Amplify-hosted web client application.

## Overview

The web client uses environment-specific API URLs to communicate with the backend services. Different environments (dev, qa, prod) need different API endpoints, and this is managed through:

1. **AWS Systems Manager (SSM) Parameter Store** - Stores environment-specific API URLs
2. **Deployment Script Automation** - Automatically retrieves and injects variables during build
3. **Monorepo Build Integration** - Coordinates with API types building process

## Environment Variables

### Client-Side Variables (Next.js)

- `NEXT_PUBLIC_SAGA_SM_API_URL` - The base URL for API calls (required for client-side)
- `NEXT_PUBLIC_TRPC_BASE_PATH` - The tRPC endpoint path (default: `/trpc`)

### Build-Time Variables

- `NODE_ENV` - Always set to `production` for Amplify builds
- `BUILD_ENV` - The deployment environment (`dev`, `qa`, `prod`)
- `NEXT_TELEMETRY_DISABLED` - Disables Next.js telemetry

## Environment Configuration

### Development Environment
- **SSM Parameter**: `/saga-sm/web-client/api-url/dev`
- **Default Value**: `http://localhost:3000`
- **Used for**: Local development, feature branches, PR previews

### QA/Staging Environment
- **SSM Parameter**: `/saga-sm/web-client/api-url/qa`
- **Default Value**: `https://api-qa.example.com`
- **Used for**: Testing, staging deployments

### Production Environment
- **SSM Parameter**: `/saga-sm/web-client/api-url/prod`
- **Default Value**: `https://api.example.com`
- **Used for**: Production deployments (main branch)

## How It Works

### 1. Infrastructure Setup
The CloudFormation template (`template.yaml`) creates:
- SSM parameters for each environment
- Amplify app with default environment variables
- IAM permissions for GitHub Actions to read SSM parameters

### 2. Deployment Process
During GitHub Actions deployment:
1. Determines environment based on branch (`main` = prod, others = dev)
2. Retrieves appropriate API URL from SSM Parameter Store
3. Updates Amplify branch environment variables
4. Deploys the application with environment-specific configuration

### 3. Runtime Usage
The Next.js application:
1. Reads `NEXT_PUBLIC_SAGA_SM_API_URL` at build time
2. Uses this URL for all API calls through the client configuration
3. Automatically adapts to the deployed environment

## Managing API URLs

### Updating Environment-Specific URLs

To update the API URL for a specific environment:

```bash
# Update development API URL
aws ssm put-parameter \
  --name "/saga-sm/web-client/api-url/dev" \
  --value "https://new-dev-api.example.com" \
  --type "String" \
  --overwrite

# Update production API URL
aws ssm put-parameter \
  --name "/saga-sm/web-client/api-url/prod" \
  --value "https://new-prod-api.example.com" \
  --type "String" \
  --overwrite

# Update QA API URL
aws ssm put-parameter \
  --name "/saga-sm/web-client/api-url/qa" \
  --value "https://new-qa-api.example.com" \
  --type "String" \
  --overwrite
```

### Checking Current Values

```bash
# Check all environment API URLs
aws ssm get-parameters \
  --names "/saga-sm/web-client/api-url/dev" \
          "/saga-sm/web-client/api-url/qa" \
          "/saga-sm/web-client/api-url/prod" \
  --query "Parameters[*].{Name:Name,Value:Value}" \
  --output table
```

### Viewing Amplify Branch Environment Variables

```bash
# Get Amplify app ID
APP_ID=$(aws ssm get-parameter --name "/saga-sm/web-client/amplify/app-id" --query "Parameter.Value" --output text)

# View environment variables for a specific branch
aws amplify get-branch --app-id "$APP_ID" --branch-name "main" --query "branch.environmentVariables"
```

## Branch-to-Environment Mapping

| Branch Pattern | Environment | API URL Source |
|---------------|-------------|----------------|
| `main` | `prod` | `/saga-sm/web-client/api-url/prod` |
| `develop` | `qa` | `/saga-sm/web-client/api-url/qa` |
| `pr-*` | `dev` | `/saga-sm/web-client/api-url/dev` |
| Others | `dev` | `/saga-sm/web-client/api-url/dev` |

## Deployment Commands

### Initial Infrastructure Deployment

```bash
cd apps/web-client
sam build
sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
```

### Manual Environment Variable Update

If you need to manually update environment variables for a branch:

```bash
# Get app ID
APP_ID=$(aws ssm get-parameter --name "/saga-sm/web-client/amplify/app-id" --query "Parameter.Value" --output text)

# Update environment variables for a branch
aws amplify update-branch \
  --app-id "$APP_ID" \
  --branch-name "your-branch-name" \
  --environment-variables '{
    "NEXT_PUBLIC_SAGA_SM_API_URL": "https://your-api-url.com",
    "NEXT_PUBLIC_TRPC_BASE_PATH": "/trpc",
    "NODE_ENV": "production"
  }'
```

## Troubleshooting

### Environment Variable Not Taking Effect

1. Check if the SSM parameter exists and has the correct value
2. Verify the GitHub Actions deployment completed successfully
3. Check Amplify branch environment variables in the AWS console
4. Ensure the Next.js build process can access the variables

### API Calls Going to Wrong Environment

1. Verify the branch-to-environment mapping is correct
2. Check the `NEXT_PUBLIC_SAGA_SM_API_URL` value in the browser's developer tools
3. Confirm the Amplify branch has the correct environment variables set

### Permission Issues

If GitHub Actions can't read SSM parameters:
1. Check the IAM role permissions in the CloudFormation template
2. Verify the OIDC provider is configured correctly
3. Ensure the GitHub repository configuration matches the IAM trust policy

## Security Considerations

- SSM parameters are not encrypted by default but can be made SecureString if needed
- Environment variables in Amplify are visible in the AWS console
- Client-side variables (`NEXT_PUBLIC_*`) are embedded in the built application and visible to users
- Never store sensitive secrets in client-side environment variables

## Future Enhancements

- Add support for additional environments (staging, preview, etc.)
- Implement encrypted SSM parameters for sensitive values
- Add automated validation of API URLs during deployment
- Create monitoring/alerting for environment variable changes

