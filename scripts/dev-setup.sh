#!/bin/bash

# Development setup script for saga-sm
# Helps developers quickly switch between development modes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

show_help() {
    echo "Development setup script for saga-sm"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  local      Setup for local development (use saga-soa file: dependencies)"
    echo "  ci         Setup for CI-like environment (use published packages)"
    echo "  status     Show current dependency mode"
    echo "  help       Show this help message"
    echo ""
    echo "Local Development Mode:"
    echo "  - Uses saga-soa packages via file: dependencies"
    echo "  - Requires saga-soa to be cloned as sibling directory"
    echo "  - Allows real-time development of saga-soa packages"
    echo ""
    echo "CI Mode:"
    echo "  - Uses published @hipponot packages from GitHub Packages"
    echo "  - Mirrors CI/CD environment locally"
    echo "  - Requires GITHUB_TOKEN for package access"
    echo ""
}

setup_local() {
    log_info "🔧 Setting up local development mode"
    
    # Switch to local dependencies
    "$SCRIPT_DIR/switch-saga-soa-deps.sh" local
    
    # Install dependencies
    log_info "📦 Installing dependencies"
    cd "$PROJECT_ROOT"
    pnpm install
    
    # Build saga-soa dependencies
    log_info "🏗️ Building saga-soa dependencies"
    "$SCRIPT_DIR/build-saga-soa.sh"
    
    log_success "🎉 Local development setup complete!"
    log_info "You can now develop saga-sm with live saga-soa dependencies"
}

setup_ci() {
    log_info "🔧 Setting up CI-like environment"
    
    # Check for GITHUB_TOKEN
    if [ -z "$GITHUB_TOKEN" ]; then
        log_error "GITHUB_TOKEN environment variable is required for CI mode"
        log_info "Set it with: export GITHUB_TOKEN=your_token_here"
        exit 1
    fi
    
    # Switch to published dependencies
    "$SCRIPT_DIR/switch-saga-soa-deps.sh" published
    
    # Install dependencies
    log_info "📦 Installing dependencies"
    cd "$PROJECT_ROOT"
    pnpm install
    
    log_success "🎉 CI-like environment setup complete!"
    log_info "You're now using published @hipponot packages"
}

show_status() {
    log_info "📊 Current dependency mode:"
    "$SCRIPT_DIR/switch-saga-soa-deps.sh"
    echo ""
    
    # Show some key dependency versions
    log_info "📦 Key package versions:"
    if [ -f "$PROJECT_ROOT/apps/api/package.json" ]; then
        echo "  @hipponot/api-core: $(jq -r '.dependencies."@hipponot/api-core" // "not found"' "$PROJECT_ROOT/apps/api/package.json")"
        echo "  @hipponot/logger: $(jq -r '.dependencies."@hipponot/logger" // "not found"' "$PROJECT_ROOT/apps/api/package.json")"
    fi
    
    # Show .npmrc status
    if [ -f "$PROJECT_ROOT/.npmrc" ]; then
        log_info "📝 .npmrc exists (configured for GitHub Packages)"
    else
        log_info "📝 No .npmrc (using default npm registry)"
    fi
}

# Parse command
case "${1:-help}" in
    local)
        setup_local
        ;;
    ci)
        setup_ci
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac