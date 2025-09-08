# saga-sm

Complete schedule management solution with tRPC API and interactive web client built with saga-soa infrastructure.

## Project Structure

```
saga-sm/
├── apps/
│   ├── api/                    # tRPC API service
│   │   ├── src/
│   │   │   ├── sectors/        # Business logic sectors
│   │   │   │   ├── schedule/   # Schedule management
│   │   │   │   └── pubsub/     # Event definitions
│   │   │   ├── main.ts         # API bootstrap
│   │   │   └── inversify.config.ts
│   │   └── package.json
│   └── web-client/             # Next.js test application
│       ├── app/
│       │   ├── endpoints/      # Interactive endpoint testing
│       │   ├── api-test/       # Connection testing
│       │   ├── schedule-demo/  # Live demo interface
│       │   └── page.tsx        # Home page
│       ├── src/services/       # tRPC client services
│       └── package.json
├── scripts/                    # Setup automation scripts
└── package.json               # Workspace orchestration
```

## Development Setup

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- MongoDB (running locally or accessible remotely)
- saga-soa repository (for local development)

### Quick Setup

1. **Clone and setup both repositories:**
   ```bash
   # Directory structure
   dev/
   ├── saga-soa/
   └── saga-sm/
   ```

2. **Run automated setup:**
   ```bash
   cd saga-sm
   
   # Option A: pnpm link (recommended for active development)
   ./scripts/setup-local-dev.sh
   
   # Option B: file protocol (simpler, automatic updates)
   ./scripts/setup-file-protocol.sh
   ```

3. **Start development servers:**
   ```bash
   # Terminal 1: saga-soa packages in watch mode
   cd ../saga-soa && turbo run dev --filter='@saga-soa/*'
   
   # Terminal 2: saga-sm applications
   cd saga-sm && pnpm dev
   ```

### Applications

- **API Server**: http://localhost:3000
  - tRPC endpoints: `/trpc`
  - Health check: `/health`
  - PubSub port: 3002

- **Web Client**: http://localhost:3001
  - Interactive endpoint testing
  - Live schedule management demo
  - Connection diagnostics

### Environment Configuration

1. Copy `apps/api/.env.example` to `apps/api/.env`
2. Update configuration values as needed

### Scripts

**Root Level (Turborepo orchestration):**
- `pnpm dev` - Run both API and web client in dev mode
- `pnpm build` - Build all applications
- `pnpm test` - Run all tests
- `pnpm check` - Full validation across all apps

**Individual Apps:**
- `pnpm --filter @saga-sm/api dev` - Run API only
- `pnpm --filter @saga-sm/web-client dev` - Run web client only

## Architecture

### API Application (`apps/api/`)

Following saga-soa patterns:

- **Sector-based organization** - Business logic organized by domain
- **Dependency injection** - Using Inversify for service management
- **tRPC API** - Type-safe API endpoints
- **PubSub events** - Real-time event system
- **4-space indentation** - Code style consistency

**Available Endpoints:**
- `schedule.getSchedules` - Get all schedules
- `schedule.getScheduleById` - Get schedule by ID  
- `schedule.createSchedule` - Create new schedule
- `schedule.updateSchedule` - Update existing schedule
- `schedule.deleteSchedule` - Delete schedule

**PubSub Events:**
- `schedule:created` - Schedule created
- `schedule:updated` - Schedule updated
- `schedule:deleted` - Schedule deleted
- `schedule:started` - Schedule execution started
- `schedule:completed` - Schedule execution completed

### Web Client Application (`apps/web-client/`)

Next.js 15 application with App Router providing:

- **Interactive Endpoint Testing** - Full tRPC and HTTP testing interface
- **Live Demo Interface** - Schedule management with real-time updates
- **Connection Diagnostics** - API health monitoring
- **Code Generation** - Both tRPC client and cURL examples
- **Dual Service Support** - tRPC client and HTTP-based access

**Pages:**
- `/` - Navigation hub with application overview
- `/endpoints` - Interactive API endpoint explorer
- `/api-test` - Connection testing and diagnostics
- `/schedule-demo` - Live schedule management interface

## Development Features

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

## Deployment

When ready for production:

1. Update saga-soa dependencies to published npm packages
2. Build applications: `pnpm build`
3. Deploy API and web client independently
4. Configure environment variables for production