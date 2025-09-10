#!/bin/bash

# Setup script for local development with saga-soa dependencies using file: protocol
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

echo "🔧 Fixing project configuration files..."

# Fix turbo.json - replace 'pipeline' with 'tasks'
if grep -q '"pipeline"' turbo.json; then
    echo "📝 Updating turbo.json to use 'tasks' instead of 'pipeline'"
    sed -i 's/"pipeline":/"tasks":/g' turbo.json
fi

# Fix TypeScript module resolution in API app
if [ -f "apps/api/tsconfig.json" ]; then
    echo "📝 Updating TypeScript module resolution in API"
    sed -i 's/"moduleResolution": "node"/"moduleResolution": "bundler"/g' apps/api/tsconfig.json
fi

# Fix HTML entities in main.ts if they exist
if [ -f "apps/api/src/main.ts" ]; then
    echo "📝 Fixing TypeScript syntax in main.ts"
    sed -i 's/&lt;/</g; s/&gt;/>/g' apps/api/src/main.ts
fi

echo "🔗 Setting up file: protocol dependencies in API package..."

# Update API package.json to use file: protocol dependencies
if [ -f "apps/api/package.json" ]; then
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('apps/api/package.json', 'utf8'));
    
    // Update dependencies to use file: protocol
    if (pkg.dependencies) {
        pkg.dependencies['@saga-soa/api-core'] = 'file:../../../saga-soa/packages/api-core';
        pkg.dependencies['@saga-soa/db'] = 'file:../../../saga-soa/packages/db';
        pkg.dependencies['@saga-soa/logger'] = 'file:../../../saga-soa/packages/logger';
        pkg.dependencies['@saga-soa/pubsub-core'] = 'file:../../../saga-soa/packages/pubsub-core';
        pkg.dependencies['@saga-soa/config'] = 'file:../../../saga-soa/packages/config';
        pkg.dependencies['@saga-sm/api-types'] = 'file:./types';
    }
    
    // Add trpc-codegen as dev dependency
    if (!pkg.devDependencies) {
        pkg.devDependencies = {};
    }
    pkg.devDependencies['@saga-soa/trpc-codegen'] = 'file:../../../saga-soa/packages/trpc-codegen';
    
    fs.writeFileSync('apps/api/package.json', JSON.stringify(pkg, null, 4));
    "
    echo "✅ Updated API package.json with file: protocol dependencies"
else
    echo "⚠️  Warning: apps/api/package.json not found"
fi

echo "🔗 Setting up API types package..."

# Update API types package.json to use file: protocol dependencies
if [ -f "apps/api/types/package.json" ]; then
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('apps/api/types/package.json', 'utf8'));
    
    // Update devDependencies to use file: protocol
    if (pkg.devDependencies) {
        pkg.devDependencies['@saga-soa/trpc-codegen'] = 'file:../../../../saga-soa/packages/trpc-codegen';
    }
    
    fs.writeFileSync('apps/api/types/package.json', JSON.stringify(pkg, null, 4));
    "
    echo "✅ Updated API types package.json with file: protocol dependencies"
else
    echo "⚠️  Warning: apps/api/types/package.json not found"
fi

echo "📥 Installing dependencies..."
pnpm install

echo "✅ Local development setup complete!"
echo ""
echo "🚀 To start development:"
echo "  Terminal 1: cd ../saga-soa && turbo run dev --filter='@saga-soa/*' --concurrency 12"  
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
echo ""
echo "ℹ️  Note: This script now uses file: protocol linking for automatic updates"
echo "ℹ️  Changes in saga-soa packages will be reflected automatically"