# CLAUDE.md - Project Instructions for saga-sm

## 🚀 Project Overview
**saga-sm** is a monorepo project using:
- **Package Manager**: pnpm (NEVER use npm)
- **Build System**: Turbo
- **Main Apps**:
  - `apps/api` - Backend API
  - `apps/web-client` - Frontend web application
- **Testing**: Jest/Vitest with integration and unit tests
- **Database**: Prisma ORM (based on db:* commands in turbo.json)

## 🛡️ Safety Rules
- Always ask for confirmation before running any file write or delete command (e.g., `rm`, modifying files)
- If unsure, ask me explicitly before proceeding
- **Exception**: pnpm commands are always allowed, even if they contain rm/delete operations

## ✅ Permanent Tool Permissions

### Always Allowed Bash Commands
- `cd /home/skelly/dev/saga-sm/**` - Any directory navigation in saga-sm
- `cd /home/skelly/dev/saga-soa/**` - Any directory navigation in saga-soa
- `pnpm build` - Build the project
- `pnpm dev` - Run development server
- `pnpm test` - Run tests
- `pnpm test:integration` - Run integration tests
- `pnpm lint` - Run linting
- `pnpm typecheck` - Run type checking
- `pnpm check` - Run all checks (build, test, lint, typecheck)
- `pnpm clean` - Clean build artifacts
- `pnpm generate` - Generate code/types
- `pnpm exec tsx:**` - Any tsx execution
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:migrate` - Run database migrations
- `pnpm db:deploy` - Deploy database changes
- `tsup` - TypeScript bundler
- `turbo run <task>` - Any turbo command
- `find /home/skelly/dev/saga-sm/**` - File searching in saga-sm
- `find /home/skelly/dev/saga-soa/**` - File searching in saga-soa
- `ls /home/skelly/dev/saga-sm/**` - Directory listing in saga-sm
- `ls /home/skelly/dev/saga-soa/**` - Directory listing in saga-soa

### Always Allowed Script Execution
- `./scripts/dev-setup.sh` - Development environment setup
- `./scripts/quick-start.sh` - Quick start script
- `./scripts/setup-test-env.sh` - Test environment setup
- `./scripts/validate-setup.sh` - Validate setup
- `./scripts/build-saga-soa.sh` - Build saga-soa dependencies
- `./scripts/switch-saga-soa-deps.sh` - Switch saga-soa dependencies

### Always Allowed File Operations
- **Read**: `/home/skelly/dev/saga-sm/**`
- **Read**: `/home/skelly/dev/saga-soa/**`
- **Edit**: `/home/skelly/dev/saga-sm/**`
- **Edit**: `/home/skelly/dev/saga-soa/**`
- **Write**: `/home/skelly/dev/saga-sm/**`
- **Write**: `/home/skelly/dev/saga-soa/**`

## 💻 Common Development Tasks

### Running the Application
- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages
- `pnpm clean` - Clean all build artifacts

### Testing & Quality
- `pnpm test` - Run unit tests
- `pnpm test:integration` - Run integration tests
- `pnpm lint` - Check code style
- `pnpm typecheck` - Check TypeScript types
- `pnpm check` - Run all quality checks (build + test + lint + typecheck)

### Playwright Testing (Web Client)
- `pnpm playwright` - Run Playwright tests
- `pnpm playwright:headed` - Run tests with browser UI
- `pnpm playwright:ui` - Open Playwright test UI
- `pnpm playwright:debug` - Debug Playwright tests

### Database Operations
- `pnpm db:generate` - Generate Prisma client from schema
- `pnpm db:migrate` - Run database migrations
- `pnpm db:deploy` - Deploy database changes to production

### Deployment
- `pnpm deploy:web` - Deploy web client
- `pnpm deploy:api` - Deploy API locally
- `pnpm deploy` - Deploy all services

## 📝 Coding Standards & Preferences
- **Indentation**: Use 4-space indentation ONLY
- **Testing**: Write tests for every new feature
- **Package Manager**: All packages in this monorepo MUST use pnpm commands only, never npm
- **Module Format**: All packages MUST use ESM format (type: "module" in package.json)
- **Import Paths**:
  - Use proper TypeScript paths and aliases
  - ALL local TypeScript imports MUST use the `.js` suffix (required by ESM)
  - Example: `import { MyComponent } from './components/MyComponent.js'` (NOT `.ts` or no extension)
- **Error Handling**: Always handle errors appropriately
- **Type Safety**: Prefer explicit types over 'any'

## 🎯 Important Instructions & Reminders
- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- Please allow editing of all files in saga-sm and saga-soa without prompting for confirmation

## 🔧 Development Workflow Tips
1. Before making changes, run `pnpm typecheck` to ensure no existing type errors
2. After making changes, run `pnpm check` to validate everything
3. Use turbo for parallel task execution when working with multiple packages
4. Check existing code patterns in neighboring files before implementing new features
5. Always verify that required dependencies are already installed before importing them