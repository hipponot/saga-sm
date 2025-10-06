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
    echo "  - Will use GitHub CLI for authentication if available, fallback to GITHUB_TOKEN"
    echo ""
}

# Setup GitHub authentication for CI mode (adapted from build-push-deploy.sh)
setup_github_auth_for_ci() {
    log_info "Setting up GitHub authentication for published packages"
    
    # Always prefer keyring token over environment variable for reliability
    if [ -n "$GITHUB_TOKEN" ]; then
        log_info "Found GITHUB_TOKEN in environment, testing validity..."
        
        # Test the current token
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            "https://api.github.com/orgs/hipponot/packages?package_type=npm")
        
        if [ "$HTTP_CODE" = "200" ]; then
            log_success "Environment token is valid and has package access"
            return 0
        else
            log_error "Environment token failed (HTTP $HTTP_CODE)"
            log_info "Clearing environment token and trying GitHub CLI..."
            unset GITHUB_TOKEN
        fi
    fi
    
    # Check if GitHub CLI is available and authenticated
    if command -v gh >/dev/null 2>&1; then
        if ! gh auth status >/dev/null 2>&1; then
            log_error "GitHub CLI is not authenticated"
            log_info "Please run: gh auth login --hostname github.com --scopes 'repo,read:packages'"
            log_info "Or set GITHUB_TOKEN environment variable"
            exit 1
        fi
        
        # Get GitHub token from CLI
        GITHUB_TOKEN=$(gh auth token 2>/dev/null)
        if [ -z "$GITHUB_TOKEN" ]; then
            log_error "Failed to get GitHub token from CLI"
            log_info "Please refresh your GitHub token: gh auth refresh --hostname github.com --scopes 'repo,read:packages'"
            exit 1
        fi
        
        # Test the token
        log_info "Testing GitHub CLI token..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            "https://api.github.com/orgs/hipponot/packages?package_type=npm")
        
        if [ "$HTTP_CODE" = "200" ]; then
            log_success "GitHub CLI token is valid and working"
            export GITHUB_TOKEN
            return 0
        else
            log_error "GitHub CLI token failed (HTTP $HTTP_CODE)"
            log_info "Please refresh: gh auth refresh --hostname github.com --scopes 'repo,read:packages'"
            exit 1
        fi
    else
        log_error "GitHub CLI (gh) not found and no valid GITHUB_TOKEN"
        log_info "Please either:"
        log_info "  1. Install GitHub CLI: gh auth login --hostname github.com --scopes 'repo,read:packages'"
        log_info "  2. Set GITHUB_TOKEN environment variable with package read access"
        exit 1
    fi
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
    
    # Setup GitHub authentication similar to build-push-deploy.sh
    setup_github_auth_for_ci
    
    # Switch to published dependencies
    "$SCRIPT_DIR/switch-saga-soa-deps.sh" published
    
    # Install dependencies with environment token
    log_info "📦 Installing dependencies with GitHub token"
    cd "$PROJECT_ROOT"
    
    # Use environment variable approach - no .npmrc modification needed
    GITHUB_TOKEN="$GITHUB_TOKEN" pnpm install
    
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
        echo "  @hipponot/soa-api-core: $(jq -r '.dependencies."@hipponot/soa-api-core" // "not found"' "$PROJECT_ROOT/apps/api/package.json")"
        echo "  @hipponot/soa-logger: $(jq -r '.dependencies."@hipponot/soa-logger" // "not found"' "$PROJECT_ROOT/apps/api/package.json")"
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