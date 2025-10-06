#!/bin/bash

# Script to switch between local file: dependencies and published @hipponot packages
# Usage: ./scripts/switch-saga-soa-deps.sh [local|published] [--dry-run]

set -e

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

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.saga-soa-deps.json"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Parse command line arguments
MODE=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        local|published)
            MODE="$1"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [local|published] [--dry-run]"
            echo ""
            echo "Switch between local file: dependencies and published @hipponot packages"
            echo ""
            echo "Options:"
            echo "  local      Use local file: dependencies from saga-soa"
            echo "  published  Use published packages from GitHub Packages"
            echo "  --dry-run  Show what would be changed without making changes"
            echo "  --help     Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 local                 # Switch to local dependencies"
            echo "  $0 published --dry-run   # Preview published dependencies switch"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# If no mode specified, detect current mode and suggest the other
if [ -z "$MODE" ]; then
    # Check current state by examining apps/api/package.json
    if grep -q "file:../../../saga-soa" "$PROJECT_ROOT/apps/api/package.json" 2>/dev/null; then
        CURRENT_MODE="local"
        SUGGESTED_MODE="published"
    else
        CURRENT_MODE="published"
        SUGGESTED_MODE="local"
    fi
    
    log_info "Current mode appears to be: $CURRENT_MODE"
    log_info "Run with '$SUGGESTED_MODE' to switch to $SUGGESTED_MODE dependencies"
    log_info "Use --help for more information"
    exit 0
fi

log_step "Switching to $MODE dependencies"

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN MODE - No changes will be made"
fi

# Function to update package.json dependencies
update_package_json() {
    local package_path="$1"
    local dep_type="$2"  # "dependencies" or "devDependencies"
    local package_json="$package_path/package.json"
    
    if [ ! -f "$package_json" ]; then
        log_warning "Package.json not found: $package_json"
        return
    fi
    
    log_info "Updating $dep_type in $package_path"
    
    # Get the configuration for this package path (relative to project root)
    local rel_path=$(realpath --relative-to="$PROJECT_ROOT" "$package_path")
    local config_query=".packages.\"$rel_path\".$dep_type"
    
    # Check if this package has configuration
    local has_config=$(jq -r "$config_query != null" "$CONFIG_FILE")
    if [ "$has_config" != "true" ]; then
        log_info "No $dep_type configuration found for $rel_path, skipping"
        return
    fi
    
    # Get all packages that need to be updated
    local packages=$(jq -r "$config_query | keys[]" "$CONFIG_FILE")
    
    for package_name in $packages; do
        local version_query="$config_query.\"$package_name\".$MODE"
        local new_version=$(jq -r "$version_query" "$CONFIG_FILE")
        
        if [ "$new_version" = "null" ]; then
            log_warning "No $MODE version defined for $package_name in $rel_path"
            continue
        fi
        
        log_info "  $package_name: $new_version"
        
        if [ "$DRY_RUN" = false ]; then
            # Update the package.json file
            jq --arg pkg "$package_name" --arg ver "$new_version" \
               "if .$dep_type then .$dep_type[\$pkg] = \$ver else . end" \
               "$package_json" > "$package_json.tmp" && \
               mv "$package_json.tmp" "$package_json"
        fi
    done
}

# Function to setup .npmrc
setup_npmrc() {
    local npmrc_file="$PROJECT_ROOT/.npmrc"
    
    if [ "$MODE" = "published" ]; then
        log_step "Setting up .npmrc for GitHub Packages"
        
        if [ "$DRY_RUN" = false ]; then
            # Always use environment variable placeholder - never write actual tokens to .npmrc
            cat > "$npmrc_file" << EOF
@hipponot:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}
EOF
            log_success "Created .npmrc for GitHub Packages (using environment variable)"
        else
            log_info "Would create .npmrc with GitHub Packages configuration"
        fi
    else
        log_step "Cleaning up .npmrc (not needed for local dependencies)"
        
        if [ "$DRY_RUN" = false ]; then
            if [ -f "$npmrc_file" ]; then
                # Remove GitHub Packages configuration but preserve other settings
                if grep -q "@hipponot:registry" "$npmrc_file"; then
                    grep -v -e "@hipponot:registry" -e "//npm.pkg.github.com" "$npmrc_file" > "$npmrc_file.tmp" || true
                    if [ -s "$npmrc_file.tmp" ]; then
                        mv "$npmrc_file.tmp" "$npmrc_file"
                        log_success "Cleaned up .npmrc (kept other settings)"
                    else
                        rm -f "$npmrc_file.tmp" "$npmrc_file"
                        log_success "Removed .npmrc (was only GitHub Packages config)"
                    fi
                fi
            fi
        else
            log_info "Would clean up GitHub Packages configuration from .npmrc"
        fi
    fi
}

# Main execution
log_info "Project root: $PROJECT_ROOT"
log_info "Configuration: $CONFIG_FILE"

# Validate saga-soa availability for local mode
if [ "$MODE" = "local" ]; then
    SAGA_SOA_PATH="$PROJECT_ROOT/../saga-soa"
    if [ ! -d "$SAGA_SOA_PATH" ]; then
        log_error "saga-soa directory not found at: $SAGA_SOA_PATH"
        log_error "Local mode requires saga-soa to be cloned as a sibling directory"
        exit 1
    fi
    log_success "Found saga-soa at: $SAGA_SOA_PATH"
fi

# Setup .npmrc
setup_npmrc

# Update each package
log_step "Updating package.json files"

# Process apps/api
update_package_json "$PROJECT_ROOT/apps/api" "dependencies"
update_package_json "$PROJECT_ROOT/apps/api" "devDependencies"

# Process packages/api-types
update_package_json "$PROJECT_ROOT/packages/api-types" "devDependencies"

if [ "$DRY_RUN" = false ]; then
    log_step "Cleaning up package-lock files and node_modules"
    
    # Remove package-lock.json files to force fresh resolution
    find "$PROJECT_ROOT" -name "package-lock.json" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    
    # Remove pnpm-lock.yaml to force fresh resolution
    rm -f "$PROJECT_ROOT/pnpm-lock.yaml"
    
    log_success "Dependencies switched to $MODE mode!"
    log_info "Next steps:"
    log_info "  1. Run 'pnpm install' to install dependencies"
    
    if [ "$MODE" = "local" ]; then
        log_info "  2. Build saga-soa packages: './scripts/build-saga-soa.sh'"
    fi
    
    log_info "  3. Run tests to verify everything works"
else
    log_info "DRY RUN completed. Use without --dry-run to make changes."
fi