# Environment Configuration Guide

This guide explains how to set up environment variables for local development and how they relate to the Docker Compose configuration.

## Quick Setup

1. **Copy example files to create your local environment:**
   ```bash
   # Root level (for all services)
   cp .env.example .env
   
   # API service
   cp apps/api/.env.example apps/api/.env
   
   # Web client
   cp apps/web-client/.env.example apps/web-client/.env.local
   
   # Database package
   cp packages/database/.env.example packages/database/.env
   ```

2. **Update your GitHub token** (required for building):
   ```bash
   # In .env file, replace with your actual token
   GITHUB_TOKEN=ghp_your_actual_token_here
   ```

3. **Start services:**
   ```bash
   # Start databases only
   docker compose up -d postgres mongodb redis
   
   # Or start all services
   docker compose up -d
   ```

## Environment Files Overview

### Root Level (`.env`)
Contains shared configuration for all services and Docker Compose:
- GitHub token for building with published packages
- Database connection strings
- Service ports and URLs

### API Service (`apps/api/.env`)
API-specific configuration:
- Server ports and logging
- Database connections (with localhost for local dev)
- Redis configuration

### Web Client (`apps/web-client/.env.local`)
Next.js client configuration:
- Public API URLs (must start with `NEXT_PUBLIC_`)
- Server configuration

### Database Package (`packages/database/.env`)
Prisma database configuration:
- PostgreSQL connection string for schema operations

## Docker Compose vs Local Development

### For Local Development (recommended)
Use `localhost` in your `.env` files:
```bash
# API connects to databases on localhost
MONGODB_URI=mongodb://admin:password123@localhost:27017/saga_sm?authSource=admin
DATABASE_URL=postgresql://saga_user:password123@localhost:5432/saga_sm
```

### For Containerized Development
The docker-compose.yaml automatically overrides with service names:
```bash
# Docker Compose uses internal service names
MONGODB_URI=mongodb://admin:password123@mongodb:27017/saga_sm?authSource=admin
DATABASE_URL=postgresql://saga_user:password123@postgres:5432/saga_sm
```

## Database Credentials

All services use these consistent credentials:

### PostgreSQL
- Host: `localhost` (local) / `postgres` (container)
- Port: `5432`
- Database: `saga_sm`
- User: `saga_user`
- Password: `password123`

### MongoDB
- Host: `localhost` (local) / `mongodb` (container)
- Port: `27017`
- Database: `saga_sm`
- Admin User: `admin`
- Password: `password123`
- Auth Source: `admin`

### Redis
- Host: `localhost` (local) / `redis` (container)
- Port: `6379`
- No authentication required

## Service Ports

- **API Server**: `3000`
- **PubSub Service**: `3002`
- **Web Client**: `3001`
- **PostgreSQL**: `5432`
- **MongoDB**: `27017`
- **Redis**: `6379`

## GitHub Token Setup

### Quick Setup (Recommended)
```bash
# If you have GitHub CLI:
gh auth refresh --hostname github.com --scopes "repo,read:packages"
export GITHUB_TOKEN=$(gh auth token)

# Test it works:
docker-compose build api
```

### Manual Token Creation
1. Go to https://github.com/settings/personal-access-tokens/tokens
2. Generate new token with `repo` + `read:packages` scopes
3. Export: `export GITHUB_TOKEN="your_token_here"`

### Token Management Commands
```bash
# Check current token status
gh auth status

# Get current token
gh auth token

# Refresh token with correct scopes
gh auth refresh --hostname github.com --scopes "repo,read:packages"
```

## Docker Authentication

### Build with Authentication
```bash
# Option 1: Environment variable (recommended)
export GITHUB_TOKEN=$(gh auth token)
docker-compose build

# Option 2: Inline variable
GITHUB_TOKEN="your_token" docker-compose build

# Option 3: Add to .env file
echo "GITHUB_TOKEN=$(gh auth token)" >> .env
docker-compose build
```

### Fallback: Local Dependencies
```bash
# Switch to local saga-soa dependencies (no token needed)
./scripts/switch-saga-soa-deps.sh local
docker-compose build
```

## Troubleshooting

### "Module not found" errors
Ensure workspace dependencies are built:
```bash
pnpm install
pnpm build
```

### Database connection errors
1. Check that Docker services are running: `docker compose ps`
2. Verify credentials match between `.env` and `docker-compose.yaml`
3. Wait for services to fully start (can take 10-30 seconds)

### GitHub token errors during build
**Common Errors & Solutions:**
- **401 Unauthorized** → Token missing: `export GITHUB_TOKEN=$(gh auth token)`
- **403 Forbidden** → Wrong scopes: `gh auth refresh --hostname github.com --scopes "repo,read:packages"`
- **Docker build fails** → Export token before building: `export GITHUB_TOKEN=$(gh auth token)`

**Troubleshooting Steps:**
1. Verify token has correct scopes: `gh auth status`
2. Test token works: `gh auth token`
3. Export token: `export GITHUB_TOKEN=$(gh auth token)`
4. Test Docker build: `docker-compose build api`
5. **Fallback**: Use local mode: `./scripts/switch-saga-soa-deps.sh local`

## Development Workflow

1. **First time setup:**
   ```bash
   ./scripts/quick-start.sh
   ```

2. **Daily development:**
   ```bash
   # Start databases
   docker compose up -d postgres mongodb redis
   
   # Start development servers
   pnpm dev
   ```

3. **Full Docker stack:**
   ```bash
   docker compose up -d
   ```

## Related Documentation

- [README.md](README.md) - Main project documentation with setup and dependency management
- [Web Client Environment Variables](apps/web-client/ENVIRONMENT_VARIABLES.md) - Deployment-focused environment management
- [Testing Guide](TESTING.md) - Comprehensive testing setup and execution