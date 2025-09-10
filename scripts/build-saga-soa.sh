#!/bin/bash

# Helper script to build saga-soa packages
# This script ensures saga-soa packages are built before Docker containers use them

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

# Get script directory and workspace paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAGA_SM_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SAGA_SOA_ROOT="$(cd "$SAGA_SM_ROOT/../saga-soa" && pwd)"

log_info "Saga-SM Root: $SAGA_SM_ROOT"
log_info "Saga-SOA Root: $SAGA_SOA_ROOT"

# Check if saga-soa directory exists
if [ ! -d "$SAGA_SOA_ROOT" ]; then
    log_error "Saga-SOA directory not found at: $SAGA_SOA_ROOT"
    log_error "Please ensure saga-soa is cloned as a sibling directory to saga-sm"
    exit 1
fi

# Check if package.json exists in saga-soa
if [ ! -f "$SAGA_SOA_ROOT/package.json" ]; then
    log_error "package.json not found in saga-soa directory"
    log_error "Please ensure saga-soa is properly initialized"
    exit 1
fi

log_step "Step 1: Installing saga-soa dependencies"
cd "$SAGA_SOA_ROOT"

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    log_error "pnpm is not installed or not in PATH"
    log_error "Please install pnpm: npm install -g pnpm"
    exit 1
fi

# Install dependencies
log_info "Running: pnpm install"
if pnpm install; then
    log_success "Dependencies installed successfully"
else
    log_error "Failed to install dependencies"
    exit 1
fi

log_step "Step 2: Building saga-soa packages"

# Build all packages
log_info "Running: pnpm run build"
if pnpm run build; then
    log_success "Saga-SOA packages built successfully"
else
    log_error "Failed to build saga-soa packages"
    exit 1
fi

# Verify build outputs exist
log_step "Step 3: Verifying build outputs"

# Check for some common dist directories
PACKAGES_DIR="$SAGA_SOA_ROOT/packages"
BUILD_VERIFIED=false

if [ -d "$PACKAGES_DIR" ]; then
    # Look for dist directories in packages
    for package_dir in "$PACKAGES_DIR"/*; do
        if [ -d "$package_dir/dist" ]; then
            log_info "Found build output: $(basename "$package_dir")/dist"
            BUILD_VERIFIED=true
        fi
    done
fi

if [ "$BUILD_VERIFIED" = true ]; then
    log_success "Build outputs verified"
else
    log_warning "Could not verify build outputs, but build command completed successfully"
fi

log_success "Saga-SOA build process completed successfully!"
log_info "You can now run Docker builds that depend on saga-soa packages"

# Return to original directory
cd "$SAGA_SM_ROOT"

