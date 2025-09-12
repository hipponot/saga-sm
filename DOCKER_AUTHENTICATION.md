# Docker Authentication for GitHub Packages

## Overview

The saga-sm Docker builds now use published @hipponot packages from GitHub Packages registry. This requires authentication to access these private packages.

## Setup Options

### Option 1: Environment Variable (Recommended)

```bash
# Set your GitHub Personal Access Token with packages:read scope
export GITHUB_TOKEN="your_github_personal_access_token_here"

# Build with authentication (token passed via environment variable)
docker-compose build

# Or build specific service
docker-compose build api
docker-compose build web-client
```

### Option 2: Inline Environment Variable

```bash
# Build with inline environment variable
GITHUB_TOKEN="your_token_here" docker-compose build
```

### Option 3: .env File (For local development)

```bash
# Create .env file in project root
echo "GITHUB_TOKEN=your_github_personal_access_token_here" > .env

# Then build normally (docker-compose will read from .env)
docker-compose build
```

## Fallback: Use Local Dependencies

If you don't have access to the published packages, you can switch to local development mode:

```bash
# Switch to local saga-soa dependencies
./scripts/switch-saga-soa-deps.sh local

# Build with local dependencies (requires saga-soa as sibling directory)
docker-compose build

# Switch back to published when ready
./scripts/switch-saga-soa-deps.sh published
```

## Getting Your GitHub Token Locally

### Using GitHub CLI (Recommended)

If you have GitHub CLI installed, you can get your token easily:

```bash
# Check if you're authenticated and see current scopes
gh auth status

# Get your current token
gh auth token

# Export token for immediate use
export GITHUB_TOKEN=$(gh auth token)
```

### Refreshing Token with Required Scopes

If your token doesn't have `read:packages` scope, refresh it:

```bash
# Method 1: Refresh token with packages scope (opens browser)
gh auth refresh --hostname github.com --scopes "repo,read:packages"

# Method 2: Re-authenticate completely
gh auth login --scopes "repo,read:packages"
```

### Manual Token Creation

If you don't have GitHub CLI or prefer manual setup:

1. Go to https://github.com/settings/personal-access-tokens/tokens
2. Click "Generate new token" (Classic)
3. Select scopes: 
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:packages` (Download packages from GitHub Packages)
4. Copy the token and use it in the Docker build methods above

## Troubleshooting

### Common Errors

**401 Unauthorized**
```
ERR_PNPM_FETCH_401  GET https://npm.pkg.github.com/@hipponot%2Ftrpc-codegen: Unauthorized - 401
No authorization header was set for the request.
```
- **Cause**: Missing GITHUB_TOKEN or invalid token
- **Solution**: Set your token: `export GITHUB_TOKEN=$(gh auth token)`

**403 Forbidden** 
```
ERR_PNPM_FETCH_403  GET https://npm.pkg.github.com/@hipponot%2Fapi-core: Forbidden - 403
An authorization header was used: Bearer gho_[hidden]
```
- **Cause**: Token lacks `read:packages` scope
- **Solution**: Refresh token with proper scopes: `gh auth refresh --hostname github.com --scopes "repo,read:packages"`

**404 Not Found**
- **Cause**: Package doesn't exist or wrong registry
- **Solution**: Verify package name and ensure .npmrc is configured correctly

**Docker Build Issues**
- **Missing pnpm-lock.yaml**: Run `pnpm install` first to generate lock file
- **Build cache issues**: Try `docker-compose build --no-cache`
- **Token not passed**: Ensure GITHUB_TOKEN is exported before running docker-compose

### Quick Diagnostics

```bash
# Test if your token works
npm view @hipponot/api-core --registry=https://npm.pkg.github.com

# Check what scopes your token has
gh auth status

# Verify environment variable is set
echo $GITHUB_TOKEN
```

### Working Example Flow

```bash
# 1. Get token with correct scopes
gh auth refresh --hostname github.com --scopes "repo,read:packages"

# 2. Export for Docker
export GITHUB_TOKEN=$(gh auth token)

# 3. Generate lock file if missing
pnpm install

# 4. Build Docker services
docker-compose build api
```