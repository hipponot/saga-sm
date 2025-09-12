#!/bin/bash

# Setup test environment for saga-sm integration tests
# This script sets up databases and runs Prisma migrations

set -e

echo "🚀 Setting up saga-sm test environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Change to the script directory
cd "$(dirname "$0")/.."

# Start databases
print_status "Starting databases (PostgreSQL, MongoDB, Redis)..."
docker compose up -d postgres mongodb redis

# Wait for databases to be ready
print_status "Waiting for databases to start..."
sleep 5

# Check if databases are healthy
print_status "Checking database connectivity..."

# Test PostgreSQL connection
if docker exec saga-sm-postgres pg_isready -U saga_user -d saga_sm > /dev/null 2>&1; then
    print_status "PostgreSQL is ready"
else
    print_error "PostgreSQL is not ready. Please check the container logs."
    exit 1
fi

# Test MongoDB connection
if docker exec saga-sm-mongodb mongosh --eval "db.runCommand('ping')" --quiet > /dev/null 2>&1; then
    print_status "MongoDB is ready"
else
    print_error "MongoDB is not ready. Please check the container logs."
    exit 1
fi

# Setup database schema with Prisma
print_status "Setting up database schema..."
cd packages/database
DATABASE_URL="postgresql://saga_user:password123@localhost:5432/saga_sm" \
    npx prisma db push --schema ./prisma/schema.prisma --accept-data-loss

print_status "Generating Prisma client..."
npx prisma generate --schema ./prisma/schema.prisma

cd ../..

# Verify setup by running a quick test
print_status "Verifying database setup..."
cd apps/api
if DATABASE_URL="postgresql://saga_user:password123@localhost:5432/saga_sm" \
   node -e "
   import('./../../packages/database/dist/index.js').then(async (db) => {
     try {
       await db.prisma.\$connect();
       console.log('✅ Database connection successful!');
       await db.prisma.\$disconnect();
     } catch (error) {
       console.error('❌ Database connection failed:', error.message);
       process.exit(1);
     }
   });" > /dev/null 2>&1; then
    print_status "Database connection verified"
else
    print_error "Database connection verification failed"
    exit 1
fi

cd ../..

print_status "Test environment setup complete!"
echo ""
echo "🎯 You can now run integration tests:"
echo "   cd apps/api && pnpm test:integration"
echo ""
echo "📊 Or run all tests:"
echo "   cd apps/api && pnpm test:all"
echo ""
echo "🔍 To check database status:"
echo "   docker compose ps"
echo ""
echo "🛑 To stop databases:"
echo "   docker compose down"