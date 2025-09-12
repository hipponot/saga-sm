# GitHub Token Setup - Quick Reference

## TL;DR - Get Your Token Working

```bash
# If you have GitHub CLI (recommended):
gh auth refresh --hostname github.com --scopes "repo,read:packages"
export GITHUB_TOKEN=$(gh auth token)

# Test it works:
docker-compose build api
```

## What You Need

Your GitHub token must have these scopes:
- ✅ `repo` - Access to repositories  
- ✅ `read:packages` - Access to GitHub Packages

## Commands

### Get Current Token
```bash
gh auth token
```

### Check Current Scopes
```bash
gh auth status
```

### Refresh Token (Opens Browser)
```bash
gh auth refresh --hostname github.com --scopes "repo,read:packages"
```

### Export for Docker
```bash
export GITHUB_TOKEN=$(gh auth token)
```

### Test Docker Build
```bash
docker-compose build api
```

## Manual Setup

If you don't have GitHub CLI:
1. Go to https://github.com/settings/personal-access-tokens/tokens
2. Generate new token with `repo` + `read:packages` scopes
3. Export: `export GITHUB_TOKEN="your_token_here"`

## Switching Package Sources

```bash
# Use published packages (requires token)
./scripts/switch-saga-soa-deps.sh published

# Use local packages (no token needed)  
./scripts/switch-saga-soa-deps.sh local
```

## Common Errors

- **401 Unauthorized** → Token missing: `export GITHUB_TOKEN=$(gh auth token)`
- **403 Forbidden** → Wrong scopes: `gh auth refresh --hostname github.com --scopes "repo,read:packages"`
- **Docker build fails** → Export token: `export GITHUB_TOKEN=$(gh auth token)`

See `DOCKER_AUTHENTICATION.md` for full details.