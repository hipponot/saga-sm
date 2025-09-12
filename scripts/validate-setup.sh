#!/bin/bash

# Validate Setup Script - Quick verification for saga-sm development environment
# This script runs a comprehensive check to ensure the development environment is working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SUCCESS="✅"
ERROR="❌"
WARNING="⚠️"
INFO="ℹ️"

log_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

log_success() {
    echo -e "${GREEN}${SUCCESS} $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

log_error() {
    echo -e "${RED}${ERROR} $1${NC}"
}

# Check database connectivity
check_databases() {
    echo ""
    log_info "Checking database services..."
    
    # Check PostgreSQL
    if docker exec saga-sm-postgres pg_isready -U saga_user -d saga_sm >/dev/null 2>&1; then
        log_success "PostgreSQL is running"
    else
        log_warning "PostgreSQL not accessible. Check: docker logs saga-sm-postgres"
        return 1
    fi
    
    # Check MongoDB
    if docker exec saga-sm-mongodb mongosh --eval "db.runCommand('ping')" --quiet >/dev/null 2>&1; then
        log_success "MongoDB is running"
    else
        log_warning "MongoDB not accessible. Check: docker logs saga-sm-mongodb"
        return 1
    fi
    
    # Check Redis
    if docker exec saga-sm-redis redis-cli ping | grep -q PONG >/dev/null 2>&1; then
        log_success "Redis is running"
    else
        log_warning "Redis not accessible. Check: docker logs saga-sm-redis"
        return 1
    fi
    
    return 0
}

# Test build process
test_build() {
    echo ""
    log_info "Testing build process..."
    
    if pnpm build >/dev/null 2>&1; then
        log_success "All packages build successfully"
        return 0
    else
        log_error "Build failed. Run: pnpm build"
        return 1
    fi
}

# Test individual package tests
test_packages() {
    echo ""
    log_info "Running package tests..."
    
    local failed=0
    
    # Test API package
    if pnpm run --dir apps/api test >/dev/null 2>&1; then
        log_success "API tests passed (37 tests)"
    else
        log_error "API tests failed. Check: pnpm run --dir apps/api test"
        failed=1
    fi
    
    # Test API types package
    if pnpm run --dir apps/api/types test >/dev/null 2>&1; then
        log_success "API types tests passed"
    else
        log_error "API types tests failed. Check: pnpm run --dir apps/api/types test"
        failed=1
    fi
    
    # Test database package
    if pnpm run --dir packages/database test >/dev/null 2>&1; then
        log_success "Database package validated"
    else
        log_error "Database package test failed"
        failed=1
    fi
    
    return $failed
}

# Check saga-soa integration
check_saga_soa() {
    echo ""
    log_info "Checking saga-soa integration..."
    
    if [ -d "../saga-soa" ]; then
        log_success "saga-soa repository found"
    else
        log_warning "saga-soa repository not found at ../saga-soa"
        log_info "This may affect local development features"
        return 1
    fi
    
    # Check if dependencies are properly linked
    if grep -q "file:../../../saga-soa" apps/api/package.json >/dev/null 2>&1; then
        log_success "saga-soa dependencies are linked"
    else
        log_warning "saga-soa dependencies not linked. Run: ./scripts/dev-setup.sh local"
        return 1
    fi
    
    return 0
}

# Main validation
main() {
    echo ""
    echo "================================================================"
    echo "🔍 saga-sm Development Environment Validation"
    echo "================================================================"
    
    local exit_code=0
    
    # Run checks
    if ! check_databases; then
        exit_code=1
    fi
    
    if ! test_build; then
        exit_code=1
    fi
    
    if ! test_packages; then
        exit_code=1
    fi
    
    if ! check_saga_soa; then
        # This is a warning, not a failure
        log_info "saga-soa integration can be set up later if needed"
    fi
    
    echo ""
    echo "================================================================"
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All validation checks passed!${NC}"
        echo ""
        echo "Your development environment is ready for:"
        echo "  • API development and testing"
        echo "  • Database operations with Prisma"
        echo "  • tRPC endpoint development"
        echo "  • Full-stack development workflow"
        echo ""
        echo "Next steps:"
        echo "  pnpm dev              # Start development servers"
        echo "  pnpm test             # Run all tests"
        echo "  ./scripts/quick-start.sh # Re-run setup if needed"
    else
        echo -e "${RED}❌ Some validation checks failed.${NC}"
        echo ""
        echo "Common solutions:"
        echo "  • Run: docker compose up -d postgres mongodb redis"
        echo "  • Run: ./scripts/quick-start.sh"
        echo "  • Check database logs: docker logs saga-sm-postgres"
        echo "  • Ensure saga-soa is cloned: git clone ... ../saga-soa"
    fi
    echo "================================================================"
    
    exit $exit_code
}

# Change to script directory
cd "$(dirname "$0")/.."

# Run validation
main "$@"