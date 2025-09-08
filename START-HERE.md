# Start Here - Developer Onboarding

Welcome to **saga-sm** (Saga Schedule Manager)! This guide will get you up and running for development.

## What is saga-soa?

**saga-soa** is our shared infrastructure framework for building consistent APIs across different protocols:

- **Multi-protocol support**: REST endpoints, tRPC procedures, and TypeGraphQL resolvers
- **Common patterns**: Dependency injection, logging, database connections, and PubSub events
- **Developer experience**: Hot reloading, type safety, and consistent project structure
- **Business logic organization**: Sector-based architecture for domain separation

Think of saga-soa as the foundation that handles all the plumbing, so you can focus on business logic.

## What is saga-sm?

**saga-sm** is a **tRPC API service** that provides schedule management functionality for Saga Connect. It includes:

- **Schedule CRUD operations**: Create, read, update, delete schedules
- **Real-time updates**: PubSub events for schedule changes (`schedule:created`, `schedule:updated`, etc.)
- **Type-safe API**: Full TypeScript support from API to client
- **Interactive testing**: Web client for endpoint exploration and testing

## Project Structure

```
saga-sm/
├── apps/
│   ├── api/                    # tRPC API service (port 3000)
│   │   ├── src/sectors/        # Business logic by domain
│   │   └── src/main.ts         # Service bootstrap
│   └── web-client/             # Next.js test client (port 3001)
│       ├── app/                # Testing interfaces
│       └── src/services/       # tRPC client integration
└── scripts/                    # Development setup automation
```

## Development Setup

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8
- **MongoDB** (local or remote)
- **saga-soa repository** (must be cloned alongside this project)

### Required Directory Structure

```
dev/
├── saga-soa/          # Shared infrastructure (clone first)
└── saga-sm/           # This project
```

### Quick Setup

**1. Clone both repositories:**
```bash
cd dev/
git clone [saga-soa-repo-url] saga-soa
git clone [saga-sm-repo-url] saga-sm
```

**2. Link saga-sm to saga-soa for concurrent development:**
```bash
cd saga-sm

# Option A: pnpm link (recommended for active saga-soa development)
./scripts/setup-local-dev.sh

# Option B: file protocol (simpler, automatic updates)
./scripts/setup-file-protocol.sh
```

**3. Configure environment:**
```bash
# Copy and customize API configuration
cp apps/api/.env.example apps/api/.env
# Update MongoDB URI and other settings as needed
```

## Starting Development

### Terminal 1: Start saga-soa packages (if using pnpm link)
```bash
cd ../saga-soa
turbo run dev --filter='@saga-soa/*'
```

### Terminal 2: Start saga-sm applications
```bash
cd saga-sm
pnpm dev
```

This starts both:
- **API Server**: http://localhost:3000 (tRPC endpoints at `/trpc`)
- **Web Client**: http://localhost:3001 (interactive testing interface)

## Available Applications

### API Server (http://localhost:3000)
- **tRPC Endpoints**: `/trpc` - Type-safe API procedures
- **Health Check**: `/health` - Service status
- **PubSub Events**: Port 3002 - Real-time schedule events

### Web Client (http://localhost:3001)
- **Endpoint Explorer** (`/endpoints`) - Test all API endpoints interactively
- **Schedule Demo** (`/schedule-demo`) - Live schedule management with real-time updates
- **API Testing** (`/api-test`) - Connection diagnostics and endpoint testing
- **Code Generation** - Copy-ready tRPC client and cURL examples

## Available Scripts

### Root Level (Turborepo)
```bash
pnpm dev          # Run both API and web client
pnpm build        # Build all applications  
pnpm test         # Run all tests
pnpm check        # Full validation (build + test + lint + typecheck)
pnpm lint         # Lint all code
pnpm typecheck    # TypeScript validation
```

### Individual Applications
```bash
# API only
pnpm --filter @saga-sm/api dev
pnpm --filter @saga-sm/api test

# Web client only  
pnpm --filter @saga-sm/web-client dev
pnpm --filter @saga-sm/web-client test
```

## Testing

### Run All Tests
```bash
pnpm test                    # All tests across workspace
pnpm --filter @saga-sm/api test          # API tests only
pnpm --filter @saga-sm/web-client test   # Client tests only
```

### Test Types
- **Unit tests**: Individual function/class testing
- **Integration tests**: API endpoint and database testing
- **Type checking**: TypeScript validation across codebase

## Development Workflow

1. **Make changes** in either saga-soa or saga-sm
2. **Hot reloading** automatically applies changes
3. **Test endpoints** using the web client at http://localhost:3001
4. **Run validation** with `pnpm check` before commits
5. **Monitor logs** in both terminal windows for errors

## Available Endpoints

The tRPC API provides these schedule management endpoints:

- `schedule.getSchedules` - Retrieve all schedules
- `schedule.getScheduleById` - Get specific schedule by ID
- `schedule.createSchedule` - Create new schedule
- `schedule.updateSchedule` - Update existing schedule
- `schedule.deleteSchedule` - Remove schedule

## PubSub Events

Real-time events for schedule changes:

- `schedule:created` - New schedule created
- `schedule:updated` - Schedule modified
- `schedule:deleted` - Schedule removed
- `schedule:started` - Schedule execution began
- `schedule:completed` - Schedule execution finished

## Troubleshooting

### Common Issues

**"saga-soa packages not found"**
- Ensure saga-soa is cloned in the correct directory structure
- Re-run the setup script: `./scripts/setup-local-dev.sh`

**"Database connection failed"**
- Check MongoDB is running locally or update `MONGODB_URI` in `apps/api/.env`
- Verify network connectivity to remote MongoDB instance

**"Port already in use"**
- API (3000), Web Client (3001), or PubSub (3002) ports are occupied
- Stop other services or update port configuration

**"Hot reloading not working"**
- Restart both terminal sessions
- Verify saga-soa packages are building with `turbo run dev`

### Getting Help

- Check the main README.md for detailed architecture information
- Review existing code in `apps/api/src/sectors/` for patterns
- Test endpoints interactively at http://localhost:3001/endpoints

## Next Steps

1. **Explore the codebase**: Start with `apps/api/src/sectors/schedule/`
2. **Test the API**: Use the web client to understand available endpoints
3. **Read saga-soa docs**: Understand the underlying infrastructure patterns
4. **Make your first change**: Add a new endpoint or modify existing logic

Happy coding! 🚀