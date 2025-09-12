# Docker Setup & Authentication

Docker configuration for saga-sm with support for both published packages and local saga-soa development.

## Quick Start

### Local Development (Recommended)
```bash
# Start only databases (works with local file: dependencies)
docker-compose up -d postgres mongodb redis

# Run services locally
pnpm dev
```

### Full Docker Stack - Published Packages
```bash
# Set GitHub token and build
export GITHUB_TOKEN=$(gh auth token)
docker-compose build
docker-compose --profile full up -d
```

### Full Docker Stack - Local saga-soa Development
```bash
# From the dev directory (parent of saga-sm and saga-soa)
cd /path/to/dev
docker-compose -f saga-sm/docker-compose.local.yaml build
docker-compose -f saga-sm/docker-compose.local.yaml --profile full up -d
```

### Build Script Usage
```bash
# Published packages (default)
./apps/api/scripts/build-push-deploy.sh
./apps/api/scripts/build-push-deploy.sh v1.2.3 qa

# Local saga-soa development
./apps/api/scripts/build-push-deploy.sh --local
./apps/api/scripts/build-push-deploy.sh --local v1.2.3 qa false

# Show help
./apps/api/scripts/build-push-deploy.sh --help
```

## Authentication Options

### Option 1: Environment Variable (Recommended)

```bash
# Set your GitHub token
export GITHUB_TOKEN=$(gh auth token)

# Build with authentication
docker-compose build

# Start services
docker-compose up -d
```

### Option 2: .env File

```bash
# Add to .env file in project root
echo "GITHUB_TOKEN=$(gh auth token)" >> .env

# Build normally (docker-compose reads from .env)
docker-compose build
```

### Option 3: Inline Variable

```bash
# Build with inline environment variable
GITHUB_TOKEN=$(gh auth token) docker-compose build
```

## Docker Configuration Options

### Option 1: Published Packages (default)
Uses published @hipponot packages from GitHub Packages registry:
- **Build Context**: Current directory (.)
- **Dockerfiles**: `apps/api/Dockerfile`, `apps/web-client/Dockerfile`
- **Requirements**: GitHub token for authentication
- **Usage**: `docker-compose build && docker-compose --profile full up -d`
- **Build Script**: `./apps/api/scripts/build-push-deploy.sh` (default mode)

### Option 2: Local saga-soa (with --local flag)
Uses local file: dependencies to saga-soa packages:
- **Build Context**: Dev directory (parent of saga-sm and saga-soa)
- **Dockerfiles**: `apps/api/Dockerfile.local`, `apps/web-client/Dockerfile.local`
- **Requirements**: saga-soa directory as sibling to saga-sm
- **Usage**: From dev directory: `docker-compose -f saga-sm/docker-compose.local.yaml build`
- **Build Script**: `./apps/api/scripts/build-push-deploy.sh --local`

### Fallback: Switch Dependencies

If you need to switch between modes:

```bash
# Switch to local saga-soa dependencies
./scripts/switch-saga-soa-deps.sh local

# Switch to published packages
./scripts/switch-saga-soa-deps.sh published
```

## Services

### Database-Only Mode (Default)
After running `docker-compose up -d postgres mongodb redis`:

- **PostgreSQL**: localhost:5432 (saga_user/password123/saga_sm)
- **MongoDB**: localhost:27017 (admin/password123/saga_sm)
- **Redis**: localhost:6379
- **Services**: Run locally with `pnpm dev`

### Full Stack Mode (--profile full)
After running `docker-compose --profile full up -d`:

- **API**: http://localhost:3000 (tRPC + REST endpoints)
- **Web Client**: http://localhost:3001 (Testing interface)  
- **PostgreSQL**: localhost:5432
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### Database Admin Mode (--profile admin)
```bash
docker-compose --profile admin up -d adminer
```
- **Adminer**: http://localhost:8080 (Database management UI)

## Database Setup

The Docker setup includes automatic database initialization:

```bash
# Start databases only
docker-compose up -d postgres mongodb redis

# Run database setup service (sets up Prisma schema)
docker-compose run --rm db-setup

# Or start everything together
docker-compose up -d
```

## Testing Docker Setup

### Test Local Configuration
```bash
# Run the test script to verify local Docker setup
./scripts/test-docker-local.sh
```

This script will:
- Verify saga-soa directory exists as sibling
- Check Docker prerequisites
- Switch to local dependencies if needed
- Test build both API and web-client with local Dockerfiles
- Validate docker-compose.local.yaml configuration
- Clean up test images

## Troubleshooting

### Build Authentication Errors

**403 Forbidden / 401 Unauthorized accessing @hipponot packages:**

This error occurs when the GitHub token is expired, invalid, or lacks proper scopes. Our build script now includes smart token validation to prevent unnecessary refreshes.

#### Quick Fix:
```bash
# Refresh GitHub token with required scopes
gh auth refresh -h github.com -s read:packages

# Export the new token
export GITHUB_TOKEN=$(gh auth token)

# Retry the build
./apps/api/scripts/build-push-deploy.sh
```

#### Manual Troubleshooting:
1. **Check current authentication:** `gh auth status`
2. **Test token validity:** 
   ```bash
   curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user
   ```
3. **Test package access:**
   ```bash
   npm view @hipponot/api-core --registry=https://npm.pkg.github.com
   ```
4. **Refresh token with scopes:** `gh auth refresh -h github.com -s read:packages`
5. **Update .npmrc if needed:**
   ```bash
   echo "@hipponot:registry=https://npm.pkg.github.com" > .npmrc
   echo "//npm.pkg.github.com/:_authToken=$(gh auth token)" >> .npmrc
   ```

#### Important Notes:
- The packages are public but still require GitHub authentication
- Our build script now checks if existing tokens are valid before refreshing
- Token issues most commonly occur after: system restarts, long idle periods, or scope changes
- The build script defaults to published packages; use `--local` flag for local saga-soa development

### Services Won't Start

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs api
docker-compose logs web-client

# Restart services
docker-compose restart
```

### Database Connection Issues

```bash
# Check database logs
docker logs saga-sm-postgres
docker logs saga-sm-mongodb

# Reset databases
docker-compose down -v
docker-compose up -d postgres mongodb redis
```

## Development with Docker

### Mount Source Code (Hot Reload)

The docker-compose.yaml includes volume mounts for development:

```yaml
volumes:
  - ./apps/api/src:/app/apps/api/src:ro
  - ./apps/web-client/app:/app/apps/web-client/app:ro
```

### Build Targets

```bash
# Build specific services
docker-compose build api
docker-compose build web-client

# Build all services
docker-compose build

# Force rebuild without cache
docker-compose build --no-cache
```

## Related

- [GitHub Setup](GITHUB_SETUP.md) - Token setup and authentication
- [Environment Setup](ENVIRONMENT_SETUP.md) - Local development environment