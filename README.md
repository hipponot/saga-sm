# saga-sm - Saga Schedule Manager

**saga-sm** is a tRPC API service that provides schedule management functionality for Saga Connect, built with saga-soa infrastructure.

## 🚀 Quick Start for New Developers

### What is saga-soa?

**saga-soa** is our shared infrastructure framework for building consistent APIs across different protocols:

- **Multi-protocol support**: REST endpoints, tRPC procedures, and TypeGraphQL resolvers
- **Common patterns**: Dependency injection, logging, database connections, and PubSub events
- **Developer experience**: Hot reloading, type safety, and consistent project structure
- **Business logic organization**: Sector-based architecture for domain separation

### What is saga-sm?

This project provides:

- **Example API operations**: Demonstrates CRUD operations with example entities
- **Real-time updates**: PubSub events for entity changes
- **Type-safe API**: Full TypeScript support from API to client
- **Interactive testing**: Web client for endpoint exploration and testing

## 📁 Project Structure

```
saga-sm/
├── apps/
│   ├── api/                    # tRPC API service (port 3000)
│   │   ├── src/
│   │   │   ├── sectors/        # Business logic by domain
│   │   │   │   ├── example/    # Example sector (formerly schedule)
│   │   │   │   └── pubsub/     # Event definitions
│   │   │   ├── main.ts         # API bootstrap
│   │   │   └── inversify.config.ts
│   │   └── package.json
│   └── web-client/             # Next.js test client (port 3001)
│       ├── app/                # Testing interfaces
│       │   ├── endpoints/      # Interactive endpoint testing
│       │   ├── api-test/       # Connection testing
│       │   ├── example-demo/   # Live demo interface
│       │   └── page.tsx        # Home page
│       ├── src/services/       # tRPC client integration
│       └── package.json
├── scripts/                    # Development setup automation
└── package.json               # Workspace orchestration
```

## 🛠️ Development Setup

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8  
- **Docker** with Docker Compose (for databases)
- **saga-soa repository** (must be cloned alongside this project)

### Required Directory Structure

```
dev/
├── saga-soa/          # Shared infrastructure (clone first)
└── saga-sm/           # This project
```

### 🚀 One-Command Setup

For new developers, we provide a comprehensive setup script that handles everything:

**1. Clone both repositories:**
```bash
cd dev/
git clone [saga-soa-repo-url] saga-soa
git clone [saga-sm-repo-url] saga-sm
```

**2. Run the quick-start script:**
```bash
cd saga-sm
./scripts/quick-start.sh
```

This script will:
- ✅ Check prerequisites (Node.js, pnpm, Docker)
- ✅ Install dependencies and configure saga-soa integration  
- ✅ Start database services (PostgreSQL, MongoDB, Redis)
- ✅ Setup database schema with Prisma
- ✅ Run tests to verify everything works

**3. Start developing:**
```bash
pnpm dev  # Starts API server (3000) and web client (3001)
```

### ✅ Validate Your Setup

To verify everything is working correctly:

```bash
./scripts/validate-setup.sh  # Comprehensive environment check
```

This validation script checks:
- Database connectivity (PostgreSQL, MongoDB, Redis)  
- Build process functionality
- Test suite execution
- saga-soa integration status

### Manual Setup (Alternative)

If you prefer manual control or the quick-start script doesn't work:

**1. Setup development environment:**
```bash
./scripts/dev-setup.sh local  # Configure saga-soa dependencies
```

**2. Start databases:**
```bash
docker compose up -d postgres mongodb redis
```

**3. Setup database schema:**
```bash
./scripts/setup-test-env.sh  # Setup Prisma schema and test environment
```

**4. Start applications:**
```bash
pnpm dev
```

### AWS Deployment Prerequisites

- **AWS CLI** configured with appropriate permissions
- **Required AWS permissions**: Ensure your credentials include `amplify:CreateDeployment` for web client deployment
- See [aws-deploy-permissions.json](./aws-deploy-permissions.json) for complete AWS permission requirements

### Applications

- **API Server**: http://localhost:3000
  - tRPC endpoints: `/trpc`
  - Health check: `/health`
  - PubSub port: 3002

- **Web Client**: http://localhost:3001
  - Interactive endpoint testing
  - Live schedule management demo
  - Connection diagnostics

## 📜 Available Scripts

### Root Level (Turborepo)
```bash
pnpm dev          # Run both API and web client
pnpm build        # Build all applications  
pnpm test         # Run all tests
pnpm check        # Full validation (build + test + lint + typecheck)
pnpm lint         # Lint all code
pnpm typecheck    # TypeScript validation

# Deployment (from anywhere in monorepo)
pnpm run deploy:web     # Deploy web client to Amplify
pnpm run deploy:api     # Deploy API to ECS/Fargate  
pnpm run deploy         # Build + deploy both (API then web)
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

## 🏗️ Architecture

### API Application (`apps/api/`)

Following saga-soa patterns:

- **Sector-based organization** - Business logic organized by domain
- **Dependency injection** - Using Inversify for service management
- **tRPC API** - Type-safe API endpoints
- **PubSub events** - Real-time event system
- **4-space indentation** - Code style consistency

### Web Client Application (`apps/web-client/`)

Next.js 15 application with App Router providing:

- **Interactive Endpoint Testing** - Full tRPC and HTTP testing interface
- **Live Demo Interface** - Example management with real-time updates
- **Connection Diagnostics** - API health monitoring
- **Code Generation** - Both tRPC client and cURL examples
- **Dual Service Support** - tRPC client and HTTP-based access

**Pages:**
- `/` - Navigation hub with application overview
- `/endpoints` - Interactive API endpoint explorer
- `/api-test` - Connection testing and diagnostics
- `/example-demo` - Live example management interface

## 📡 Available Endpoints

The tRPC API provides these example endpoints:

- `example.getExamples` - Retrieve all examples
- `example.getExampleById` - Get specific example by ID
- `example.createExample` - Create new example
- `example.updateExample` - Update existing example
- `example.deleteExample` - Remove example

## 📻 PubSub Events

Real-time events for example entity changes:

- `example:created` - New example created
- `example:updated` - Example modified
- `example:deleted` - Example removed
- `example:started` - Example execution began
- `example:completed` - Example execution finished

## 🧪 Testing

### Run Tests
```bash
pnpm test                         # All tests across workspace
pnpm --filter @saga-sm/api test  # API tests only
pnpm --filter @saga-sm/web-client test # Client tests only
```

### Test Types
- **Unit tests**: Individual function/class testing
- **Integration tests**: API endpoint and database testing
- **Type checking**: TypeScript validation across codebase

### Testing Documentation
For detailed testing conventions and strategies, see our [Testing Documentation](./memory-bank/testing/README.md). This includes:
- Unit testing patterns and best practices
- Test organization using `__tests__/` directory structure
- Framework choices (Vitest preferred, Jest for legacy)
- Integration with saga-soa testing standards

## 🔧 Development Features

### Hot Reloading
- saga-soa packages rebuild automatically when changed
- API server restarts on code changes
- Web client has instant hot reload

### Testing Interface
The web client provides comprehensive testing tools:

- **Endpoint Explorer** - Interactive forms for all API endpoints
- **Dual Approach** - Switch between tRPC client and HTTP calls
- **Code Generation** - Copy-ready code examples
- **Response Inspection** - Detailed API response analysis
- **Real-time Updates** - Live PubSub event monitoring

### Type Safety
- Full TypeScript support throughout
- Shared type definitions (when available)
- End-to-end type safety from API to client

## 🚨 Troubleshooting

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

## 🚀 Deployment

### Quick Deployment (from monorepo root)

```bash
# Deploy web client only
pnpm run deploy:web --env qa --force

# Deploy API only  
pnpm run deploy:api v1.2.3 prod

# Deploy everything (builds first)
pnpm run deploy
```

### Production Deployment Steps

1. Update saga-soa dependencies to published npm packages
2. Build applications: `pnpm build`
3. Deploy using convenience scripts:
   - **API**: `pnpm run deploy:api [tag] [environment] [deploy:true|false]`
   - **Web Client**: `pnpm run deploy:web [--env ENV] [--force]`
4. Configure environment variables for production

See individual deployment guides:
- [Web Client Deployment Guide](./apps/web-client/DEPLOYMENT_GUIDE.md)
- [API Deployment Guide](./apps/api/DEPLOYMENT_GUIDE.md)

## 📚 Next Steps

1. **Explore the codebase**: Start with `apps/api/src/sectors/example/`
2. **Test the API**: Use the web client to understand available endpoints
3. **Read saga-soa docs**: Understand the underlying infrastructure patterns
4. **Make your first change**: Add a new endpoint or modify existing logic