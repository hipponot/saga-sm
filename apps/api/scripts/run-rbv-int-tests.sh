#!/bin/bash
set -e

# RBV Integration Tests Setup Script
#
# SAFETY FEATURES:
# - Checks that database URL is local before running destructive operations
# - Blocks execution against known cloud database providers
# - Requires FORCE_LOCAL_DB=true to bypass local checks (cloud providers cannot be bypassed)
# - Uses PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION only after safety checks pass
#
# Usage:
#   ./run-rbv-int-tests.sh                    # Normal execution
#   FORCE_LOCAL_DB=true ./run-rbv-int-tests.sh # Bypass local check (use with caution!)
#   POSTGRES_TIMEOUT=60 ./run-rbv-int-tests.sh # Custom PostgreSQL startup timeout

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display help
show_help() {
    cat << 'EOF'
RBV Integration Tests Setup Script

DESCRIPTION:
    Sets up and runs RBV (Risk-Based Verification) integration tests in a clean,
    isolated environment. This script is designed for local development only.

USAGE:
    ./run-rbv-int-tests.sh [OPTIONS] [-- VITEST_OPTIONS]

OPTIONS:
    -h, --help              Show this help message and exit
    -t, --testNamePattern   Run only tests matching this pattern (passed to vitest)
    --                      Pass remaining arguments directly to vitest

ENVIRONMENT VARIABLES:
    POSTGRES_TIMEOUT        Timeout in seconds for PostgreSQL startup (default: 30)
    FORCE_LOCAL_DB          Set to 'true' to bypass local database checks (use with caution!)

SAFETY FEATURES:
    • Validates database URL is local before destructive operations
    • Blocks execution against cloud database providers (no bypass)
    • Requires explicit confirmation for non-standard database URLs

STEPS PERFORMED:
    1. Check prerequisites (docker, pnpm, turbo)
    2. Verify Docker daemon is running
    3. Find project root (pnpm-workspace.yaml)
    4. Set up .env file (copy from .env.example if needed)
    5. Start PostgreSQL container if not running
    6. Install dependencies if needed
    7. Generate Prisma client
    8. Build project with generated types
    9. Safety check: Validate database URL is local
    10. Reset database to clean state (migrate reset)
    11. Apply all migrations (migrate deploy)
    12. Re-generate Prisma client if schema changed
    13. Run integration tests

EXAMPLES:
    ./run-rbv-int-tests.sh                              # Run all tests
    ./run-rbv-int-tests.sh -t "should create user"      # Run specific test
    ./run-rbv-int-tests.sh -- --reporter=verbose        # Pass options to vitest
    POSTGRES_TIMEOUT=60 ./run-rbv-int-tests.sh          # Custom timeout
    FORCE_LOCAL_DB=true ./run-rbv-int-tests.sh          # Bypass local check

For more information, see the project documentation.
EOF
}

# Variable to store vitest arguments
VITEST_ARGS=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -t|--testNamePattern)
            if [[ -z "$2" || "$2" == -* ]]; then
                echo -e "${RED}❌ Option $1 requires an argument${NC}"
                exit 1
            fi
            VITEST_ARGS="$VITEST_ARGS -t \"$2\""
            shift 2
            ;;
        --)
            # Pass all remaining arguments to vitest
            shift
            VITEST_ARGS="$VITEST_ARGS $*"
            break
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use -h or --help for usage information."
            exit 1
            ;;
    esac
done

# Cleanup trap for interruptions
trap 'echo -e "${RED}\n❌ Script interrupted${NC}"; exit 1' INT TERM

echo -e "${GREEN}🚀 Starting RBV Integration Tests Setup${NC}"

# Check for required tools
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"
missing_tools=()

command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
command -v pnpm >/dev/null 2>&1 || missing_tools+=("pnpm")

# Check for turbo (might be available globally or through pnpm)
if ! command -v turbo >/dev/null 2>&1; then
    if ! pnpm turbo --version >/dev/null 2>&1; then
        missing_tools+=("turbo")
    fi
fi

if [ ${#missing_tools[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required tools: ${missing_tools[*]}${NC}"
    echo "Please install the missing tools and try again."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    echo "Please start Docker and try again."
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"

# Find the project root by looking for pnpm-workspace.yaml
# This works regardless of where the script is located or called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Keep going up until we find pnpm-workspace.yaml (project root marker)
while [ ! -f "$PROJECT_ROOT/pnpm-workspace.yaml" ] && [ "$PROJECT_ROOT" != "/" ]; do
    PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

if [ ! -f "$PROJECT_ROOT/pnpm-workspace.yaml" ]; then
    echo -e "${RED}❌ Could not find project root (no pnpm-workspace.yaml found)${NC}"
    exit 1
fi

# Change to project root for all operations
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Project root: ${PROJECT_ROOT}${NC}"
echo -e "${YELLOW}📁 Script location: ${SCRIPT_DIR}${NC}"

# Step 1: Check if .env file exists in packages/database
ENV_FILE="${PROJECT_ROOT}/packages/database/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env file not found in packages/database${NC}"
    echo "Looking for .env.example to copy..."

    # Try to find and copy .env.example
    if [ -f "${PROJECT_ROOT}/packages/database/.env.example" ]; then
        cp "${PROJECT_ROOT}/packages/database/.env.example" "$ENV_FILE"
        echo -e "${GREEN}✅ Copied .env.example to .env${NC}"
    elif [ -f "${PROJECT_ROOT}/apps/api/.env.example" ]; then
        cp "${PROJECT_ROOT}/apps/api/.env.example" "$ENV_FILE"
        echo -e "${GREEN}✅ Copied apps/api/.env.example to packages/database/.env${NC}"
    else
        echo -e "${RED}❌ No .env.example found. Please manually create ${ENV_FILE}${NC}"
        echo "See saga-sm/ENVIRONMENT_SETUP.md for details"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file exists in packages/database${NC}"
fi

# Step 2: Start PostgreSQL if not running
echo -e "${YELLOW}🐘 Checking PostgreSQL status...${NC}"
if docker compose ps postgres 2>/dev/null | grep -q "Up\|running"; then
    echo -e "${GREEN}✅ PostgreSQL is already running${NC}"
else
    echo "Starting PostgreSQL..."
    docker compose up -d postgres

    # Wait for PostgreSQL to be ready (configurable timeout)
    POSTGRES_TIMEOUT="${POSTGRES_TIMEOUT:-30}"
    echo "Waiting for PostgreSQL to be ready (timeout: ${POSTGRES_TIMEOUT}s)..."
    for i in $(seq 1 "$POSTGRES_TIMEOUT"); do
        if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
            break
        fi
        if [ $i -eq "$POSTGRES_TIMEOUT" ]; then
            echo -e "${RED}❌ PostgreSQL failed to start within ${POSTGRES_TIMEOUT} seconds${NC}"
            echo "Try increasing POSTGRES_TIMEOUT environment variable"
            exit 1
        fi
        sleep 1
        echo -n "."
    done
    echo
fi

# Step 3: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    pnpm install
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Step 4: Generate Prisma client first (before build)
echo -e "${YELLOW}📝 Generating Prisma client...${NC}"
turbo run db:generate --force

# Step 5: Build saga-soa and saga-sm with generated types
echo -e "${YELLOW}🔨 Building project...${NC}"
pnpm build

# Step 6: Reset and migrate database for clean state (idempotent)
echo -e "${YELLOW}🗄️  Resetting and migrating database for clean state...${NC}"

# SAFETY CHECK: Ensure we're only running against local databases
echo "Verifying database connection is local..."
if [ -f "$ENV_FILE" ]; then
    # Extract DATABASE_URL from .env file
    DATABASE_URL=$(grep -E "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

    # Additional check for common cloud database providers (no bypass allowed)
    if [[ "$DATABASE_URL" =~ (amazonaws\.com|database\.azure|cloud\.google|supabase|neon\.tech|planetscale|railway\.app|render\.com|digitalocean\.com|heroku) ]]; then
        echo -e "${RED}❌ SAFETY CHECK FAILED: Detected cloud database provider in URL${NC}"
        echo -e "${RED}This script must not be run against production or cloud databases!${NC}"
        exit 1
    fi

    # Check if DATABASE_URL contains localhost, 127.0.0.1, or docker container names
    if [[ ! "$DATABASE_URL" =~ (localhost|127\.0\.0\.1|postgres:|@postgres/|host\.docker\.internal) ]]; then
        echo -e "${RED}❌ SAFETY CHECK FAILED: Database URL does not appear to be local${NC}"
        echo -e "${RED}DATABASE_URL: ${DATABASE_URL}${NC}"
        echo -e "${YELLOW}This script is designed for local development only.${NC}"
        echo -e "${YELLOW}If you're certain this is a local database, you can bypass this check with:${NC}"
        echo -e "  FORCE_LOCAL_DB=true $0"

        if [ "$FORCE_LOCAL_DB" != "true" ]; then
            exit 1
        else
            echo -e "${YELLOW}⚠️  FORCE_LOCAL_DB is set - proceeding with caution${NC}"
        fi
    else
        echo -e "${GREEN}✅ Database connection appears to be local${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not verify database connection (no .env file)${NC}"
    echo -e "${YELLOW}Assuming local Docker PostgreSQL will be used${NC}"
fi

# Reset the database and apply migrations
echo "Resetting database..."
# Note: PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION is used here to bypass
# the interactive confirmation prompt in CI/testing environments.
# This is safe because we're explicitly resetting a test database.
(
    cd "${PROJECT_ROOT}/packages/database"
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" pnpm prisma migrate reset --force --skip-seed
)

# Apply migrations
echo "Applying migrations..."
(
    cd "${PROJECT_ROOT}/packages/database"
    pnpm prisma migrate deploy
)

echo -e "${GREEN}✅ Database setup complete${NC}"

# Step 7: Check if we need to regenerate Prisma client after migrations
# Only regenerate if the migration actually changed the schema
if [ -n "$(cd "${PROJECT_ROOT}/packages/database" && pnpm prisma migrate status 2>&1 | grep -E 'Database schema is up to date|No migration found')" ]; then
    echo -e "${GREEN}✅ Prisma client is already up to date${NC}"
else
    echo -e "${YELLOW}📝 Re-generating Prisma client after migrations...${NC}"
    turbo run db:generate --force
fi

# Step 8: Run integration tests
echo -e "${GREEN}🧪 Running RBV integration tests...${NC}"
if [ -n "$VITEST_ARGS" ]; then
    echo -e "${YELLOW}📌 Running with vitest options:${VITEST_ARGS}${NC}"
fi

# Run the tests (using subshell to avoid permanent directory change)
# Use eval to properly handle the quoted arguments in VITEST_ARGS
if (cd "${PROJECT_ROOT}/apps/api" && eval "pnpm test:integration $VITEST_ARGS"); then
    echo -e "${GREEN}✅ Integration tests completed successfully!${NC}"
    exit 0
else
    echo -e "${RED}❌ Integration tests failed${NC}"
    exit 1
fi