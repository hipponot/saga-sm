# Docker Setup & Authentication

Docker configuration for saga-sm with GitHub Packages authentication.

## Quick Start

```bash
# Set GitHub token and build
export GITHUB_TOKEN=$(gh auth token)
docker-compose build
docker-compose up -d
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

## Fallback: Use Local Dependencies

If you don't have access to published packages:

```bash
# Switch to local saga-soa dependencies
./scripts/switch-saga-soa-deps.sh local

# Build with local dependencies (requires saga-soa as sibling directory)
docker-compose build
```

## Services

After running `docker-compose up -d`:

- **API**: http://localhost:3000 (tRPC + REST endpoints)
- **Web Client**: http://localhost:3001 (Testing interface)  
- **PostgreSQL**: localhost:5432
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

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

## Troubleshooting

### Build Authentication Errors

**403 Forbidden / 401 Unauthorized:**
1. Check token: `gh auth status`
2. Refresh scopes: `gh auth refresh --hostname github.com --scopes "repo,read:packages"`
3. Export token: `export GITHUB_TOKEN=$(gh auth token)`
4. Retry build: `docker-compose build api`

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