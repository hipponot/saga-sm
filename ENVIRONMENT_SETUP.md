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

## GitHub Token (Required for published packages)

For Docker builds and published package mode:
```bash
export GITHUB_TOKEN=$(gh auth token)
```

**For detailed setup:** See [GitHub Setup](GITHUB_SETUP.md)

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
**Quick fixes:**
- **401/403 errors**: `export GITHUB_TOKEN=$(gh auth token)`
- **Docker build fails**: See [Docker Setup](DOCKER_SETUP.md)
- **Dependency issues**: See [Dependencies](DEPENDENCIES.md)

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

- [GitHub Setup](GITHUB_SETUP.md) - GitHub token setup and authentication
- [Docker Setup](DOCKER_SETUP.md) - Docker builds and container management
- [Dependencies](DEPENDENCIES.md) - Local vs published dependency management
- [Testing Guide](TESTING.md) - Comprehensive testing setup and execution