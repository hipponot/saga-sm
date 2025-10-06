#!/bin/bash

# Quick Start Script for saga-sm Development Environment
# This script sets up a complete development environment from scratch

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emoji indicators
SUCCESS="✅"
ERROR="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"

# Logging functions
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

log_section() {
    echo ""
    echo -e "${BLUE}${ROCKET} $1${NC}"
    echo "=================================================="
}

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        log_success "Node.js found: $NODE_VERSION"
    else
        log_error "Node.js is not installed. Please install Node.js >= 18"
        exit 1
    fi
    
    # Check pnpm
    if command -v pnpm >/dev/null 2>&1; then
        PNPM_VERSION=$(pnpm --version)
        log_success "pnpm found: v$PNPM_VERSION"
    else
        log_error "pnpm is not installed. Please install pnpm >= 8"
        echo "Install with: npm install -g pnpm"
        exit 1
    fi
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        if docker compose version >/dev/null 2>&1; then
            log_success "Docker and Docker Compose found"
        else
            log_warning "Docker Compose not found. Some features may not work."
        fi
    else
        log_warning "Docker not found. Database services will need manual setup."
    fi
    
    # Check saga-soa repository
    if [ -d "../saga-soa" ]; then
        log_success "saga-soa repository found"
    else
        log_warning "saga-soa repository not found at ../saga-soa"
        log_info "This is required for local development. Please clone saga-soa first."
    fi
}

# Setup GitHub authentication if needed (lightweight version for quick-start)
setup_github_auth_if_needed() {
    log_info "Setting up GitHub authentication for package access..."
    
    # Check if we already have a valid token in environment
    if [ -n "$GITHUB_TOKEN" ]; then
        log_info "Found GITHUB_TOKEN in environment, testing validity..."
        
        # Test the current token
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            "https://api.github.com/orgs/hipponot/packages?package_type=npm" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "200" ]; then
            log_success "Environment token is valid and has package access"
            export GITHUB_TOKEN
            return 0
        else
            log_warning "Environment token failed or invalid (HTTP $HTTP_CODE)"
            unset GITHUB_TOKEN
        fi
    fi
    
    # Try GitHub CLI
    if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
        GITHUB_TOKEN=$(gh auth token 2>/dev/null)
        if [ -n "$GITHUB_TOKEN" ]; then
            log_info "Using GitHub CLI token"
            
            # Test the CLI token
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                -H "Authorization: Bearer $GITHUB_TOKEN" \
                "https://api.github.com/orgs/hipponot/packages?package_type=npm" 2>/dev/null || echo "000")
            
            if [ "$HTTP_CODE" = "200" ]; then
                log_success "GitHub CLI token is valid"
                export GITHUB_TOKEN
                return 0
            else
                log_warning "GitHub CLI token failed (HTTP $HTTP_CODE)"
            fi
        fi
    fi
    
    # No valid authentication found
    log_error "No valid GitHub authentication found for package access"
    log_info "Quick setup options:"
    log_info "  1. Set GITHUB_TOKEN: export GITHUB_TOKEN=your_token_here"
    log_info "  2. Use GitHub CLI: gh auth login --hostname github.com --scopes 'repo,read:packages'"
    log_info "  3. For local development only: ./scripts/dev-setup.sh local"
    exit 1
}

# Setup development environment
setup_development() {
    log_section "Setting Up Development Environment"
    
    # Setup GitHub authentication first
    setup_github_auth_if_needed
    
    # Run dev setup script
    if [ -x "./scripts/dev-setup.sh" ]; then
        log_info "Running development environment setup..."
        ./scripts/dev-setup.sh ci
    else
        log_warning "dev-setup.sh not found, running manual setup..."
        
        # Manual install with token
        log_info "Installing dependencies..."
        GITHUB_TOKEN="$GITHUB_TOKEN" pnpm install
    fi
    
    # Ensure workspace symlinks are properly created (important after git clean)
    log_info "Refreshing workspace dependencies..."
    GITHUB_TOKEN="$GITHUB_TOKEN" pnpm install
    
    # Build workspace packages in correct order to establish dependencies
    log_info "Building workspace packages to establish dependencies..."
    if pnpm build >/dev/null 2>&1; then
        log_success "Workspace packages built successfully"
    else
        log_warning "Initial build had issues, but continuing setup..."
        log_info "You may need to run 'pnpm build' manually after setup"
    fi
    
    log_success "Development environment configured"
}

# Setup databases
setup_databases() {
    log_section "Setting Up Databases"
    
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        log_info "Starting databases (PostgreSQL, MongoDB, Redis)..."
        docker compose up -d postgres mongodb redis
        
        log_info "Waiting for databases to start..."
        sleep 10
        
        # Check PostgreSQL
        if docker exec saga-sm-postgres pg_isready -U saga_user -d saga_sm >/dev/null 2>&1; then
            log_success "PostgreSQL is ready"
        else
            log_warning "PostgreSQL may still be starting. Please check: docker logs saga-sm-postgres"
        fi
        
        # Check MongoDB
        if docker exec saga-sm-mongodb mongosh --eval "db.runCommand('ping')" --quiet >/dev/null 2>&1; then
            log_success "MongoDB is ready"
        else
            log_warning "MongoDB may still be starting. Please check: docker logs saga-sm-mongodb"
        fi
        
        log_success "Database services started"
    else
        log_warning "Docker not available. Please set up databases manually:"
        log_info "- PostgreSQL: localhost:5432, user: saga_user, password: password123, db: saga_sm"
        log_info "- MongoDB: localhost:27017, user: admin, password: password123, db: saga_sm"
        log_info "- Redis: localhost:6379"
    fi
}

# Setup database schema
setup_schema() {
    log_section "Setting Up Database Schema"
    
    # Create environment file for database package
    log_info "Creating database environment configuration..."
    cat > packages/database/.env << EOF
DATABASE_URL="postgresql://saga_user:password123@localhost:5432/saga_sm"
EOF

    # Setup Prisma schema
    log_info "Setting up Prisma database schema..."
    cd packages/database
    
    if DATABASE_URL="postgresql://saga_user:password123@localhost:5432/saga_sm" npx prisma db push --accept-data-loss >/dev/null 2>&1; then
        log_success "Database schema created"
    else
        log_warning "Schema setup failed. Database may not be ready yet."
        log_info "You can run this manually later: cd packages/database && DATABASE_URL=... npx prisma db push"
    fi
    
    # Generate Prisma client
    log_info "Generating Prisma client..."
    if DATABASE_URL="postgresql://saga_user:password123@localhost:5432/saga_sm" npx prisma generate >/dev/null 2>&1; then
        log_success "Prisma client generated"
    else
        log_warning "Prisma client generation may have issues"
    fi
    
    cd ../..
}

# Run tests to verify setup
verify_setup() {
    log_section "Verifying Setup"
    
    log_info "Running final build verification..."
    if pnpm build >/dev/null 2>&1; then
        log_success "Final build verification completed successfully"
    else
        log_warning "Build verification had issues. Check: pnpm build"
    fi
    
    log_info "Running tests to verify environment..."
    
    # Test API package
    if pnpm run --dir apps/api test >/dev/null 2>&1; then
        log_success "API tests passed (37 tests)"
    else
        log_warning "API tests had issues. Check: pnpm run --dir apps/api test"
    fi
    
    # Test API types package
    if pnpm run --dir packages/api-types test >/dev/null 2>&1; then
        log_success "API types tests passed"
    else
        log_warning "API types tests had issues"
    fi
    
    log_success "Environment verification completed"
}

# Display next steps
show_next_steps() {
    log_section "🎉 Setup Complete!"
    
    echo ""
    echo "Your saga-sm development environment is ready!"
    echo ""
    echo "📁 Applications:"
    echo "   • API Server: http://localhost:3000"
    echo "   • Web Client: http://localhost:3001"
    echo ""
    echo "🚀 To start developing:"
    echo "   pnpm dev                    # Start all applications"
    echo ""
    echo "🧪 To run tests:"
    echo "   pnpm test                   # Run all tests"
    echo "   pnpm run --dir apps/api test # API tests only"
    echo ""
    echo "🔍 To check services:"
    echo "   docker compose ps           # Check database status"
    echo "   pnpm check                  # Full validation"
    echo ""
    echo "📚 Useful scripts:"
    echo "   ./scripts/setup-test-env.sh # Setup test environment"
    echo "   pnpm build                  # Build all packages"
    echo "   pnpm typecheck              # TypeScript validation"
    echo ""
    echo "❓ If you encounter issues:"
    echo "   • Check the README.md for troubleshooting"
    echo "   • Ensure saga-soa is cloned in ../saga-soa"
    echo "   • Verify databases are running: docker compose ps"
    echo ""
    log_success "Happy coding! 🎯"
}

# Main execution
main() {
    echo ""
    echo "================================================================"
    echo "🚀 saga-sm Quick Start Setup"
    echo "================================================================"
    echo ""
    echo "This script will set up your complete development environment:"
    echo "  ✓ Check prerequisites (Node.js, pnpm, Docker)"
    echo "  ✓ Install dependencies and configure saga-soa integration"
    echo "  ✓ Start database services (PostgreSQL, MongoDB, Redis)"
    echo "  ✓ Setup database schema with Prisma"
    echo "  ✓ Run tests to verify everything works"
    echo ""
    
    # Confirm before proceeding
    read -p "Continue with setup? [Y/n]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    # Run setup steps
    check_prerequisites
    setup_development
    setup_databases
    setup_schema
    verify_setup
    show_next_steps
}

# Error handling
trap 'log_error "Setup failed at line $LINENO. Check the error messages above."' ERR

# Change to script directory
cd "$(dirname "$0")/.."

# Run main function
main "$@"