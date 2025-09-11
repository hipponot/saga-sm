# Web Client Configuration

## 📋 TLDR

**Local Development:**
```bash
# Copy example and customize
cp .env.example .env.local
```

**Production/Amplify:**
```bash
# Zero config needed - automatic via SSM
./scripts/deploy.sh --env dev
```

**Key Variables:**
- `NEXT_PUBLIC_SAGA_SM_API_URL` - API endpoint (auto-set in production)
- `NEXT_PUBLIC_TRPC_BASE_PATH` - tRPC path (default: `/trpc`)

---

The web-client application uses environment variables for configuration, following Next.js conventions.

## Configuration Options

### Client-Side Configuration (Available in Browser)

- `NEXT_PUBLIC_SAGA_SM_API_URL` - The URL of the saga-sm API server (default: `http://localhost:3000`)
- `NEXT_PUBLIC_TRPC_BASE_PATH` - The base path for tRPC endpoints (default: `/trpc`)

### Server-Side Configuration

- `PORT` - The port the web client runs on (default: `3001`)
- `NODE_ENV` - The environment mode (`development`, `production`, or `test`)

## Usage

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update the values in `.env.local` as needed.

3. The configuration is automatically loaded:
   - Client-side code uses `getClientConfig()` from `src/config/client-config.ts`
   - Server-side code uses `getServerConfig()` from `src/config/server-config.ts`

## Example

To point the web client to a different API server:

```bash
# .env.local
NEXT_PUBLIC_SAGA_SM_API_URL=https://api.example.com
NEXT_PUBLIC_TRPC_BASE_PATH=/trpc
```

## Architecture

The configuration follows Next.js best practices:
- Public environment variables (prefixed with `NEXT_PUBLIC_`) are embedded at build time and available in the browser
- Server-only variables are only accessible in server-side code
- Configuration is validated using Zod schemas for type safety

## Production/Amplify Configuration

For AWS Amplify hosted deployments, environment variables are **automatically managed** by the deployment script. The script:

1. 🔍 **Detects environment** from `--env` flag or branch name
2. 📥 **Retrieves API URL** from SSM Parameter Store  
3. 🔧 **Injects variables** during build process
4. 🚀 **Deploys with correct config** to Amplify

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for comprehensive documentation.

**SSM Parameter Mapping:**
- **`--env dev`**: `/saga-sm/web-client/api-url/dev`
- **`--env qa`**: `/saga-sm/web-client/api-url/qa`  
- **`--env prod`**: `/saga-sm/web-client/api-url/prod`

**Branch Auto-Mapping:**
- **`main` branch** → `prod` environment (Production)
- **`develop` branch** → `qa` environment (Staging)
- **Feature branches** → `dev` environment (Development)

**No manual configuration required** - the deployment script handles everything automatically.