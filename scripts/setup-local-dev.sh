#!/bin/bash

# Setup script for local development with saga-soa dependencies
set -e

echo "🔗 Setting up local development environment..."

# Check if saga-soa directory exists
if [ ! -d "../saga-soa" ]; then
    echo "❌ saga-soa directory not found. Please ensure saga-soa is cloned in the parent directory."
    echo "Expected structure:"
    echo "  dev/"
    echo "  ├── saga-soa/"
    echo "  └── saga-sm/"
    exit 1
fi

echo "✅ Found saga-soa directory"

# Function to link a saga-soa package
link_package() {
    local package_name=$1
    local package_path="../saga-soa/packages/${package_name}"
    
    if [ -d "$package_path" ]; then
        echo "🔗 Linking @saga-soa/${package_name}..."
        cd "$package_path"
        pnpm link --global
        cd - > /dev/null
    else
        echo "⚠️  Warning: Package ${package_name} not found at ${package_path}"
    fi
}

echo "📦 Linking saga-soa packages globally..."

# Link all required saga-soa packages
link_package "api-core"
link_package "db" 
link_package "logger"
link_package "pubsub-core"
link_package "config"

echo "🔗 Linking packages to saga-sm..."

# Link packages to this project
pnpm link --global @saga-soa/api-core @saga-soa/db @saga-soa/logger @saga-soa/pubsub-core @saga-soa/config

echo "📥 Installing remaining dependencies..."
pnpm install

echo "✅ Local development setup complete!"
echo ""
echo "🚀 To start development:"
echo "  Terminal 1: cd ../saga-soa && turbo run dev --filter='@saga-soa/*'"  
echo "  Terminal 2: cd saga-sm && pnpm dev"
echo ""
echo "📱 Applications will be available at:"
echo "  API Server: http://localhost:3000"
echo "  Web Client: http://localhost:3001"
echo ""
echo "📋 Available commands:"
echo "  pnpm dev          - Run in development mode"
echo "  pnpm build        - Build for production" 
echo "  pnpm test         - Run tests"
echo "  pnpm check        - Full validation"