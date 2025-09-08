#!/bin/bash

# Alternative setup using file: protocol for saga-soa dependencies
set -e

echo "📁 Setting up file protocol dependencies..."

# Check if saga-soa directory exists
if [ ! -d "../saga-soa" ]; then
    echo "❌ saga-soa directory not found. Please ensure saga-soa is cloned in the parent directory."
    exit 1
fi

# Create a temporary package.json with file: dependencies
echo "📝 Updating package.json with file: protocol dependencies..."

# Use node to update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update dependencies to use file: protocol
pkg.dependencies['@saga-soa/api-core'] = 'file:../saga-soa/packages/api-core';
pkg.dependencies['@saga-soa/db'] = 'file:../saga-soa/packages/db';
pkg.dependencies['@saga-soa/logger'] = 'file:../saga-soa/packages/logger';
pkg.dependencies['@saga-soa/pubsub-core'] = 'file:../saga-soa/packages/pubsub-core';
pkg.dependencies['@saga-soa/config'] = 'file:../saga-soa/packages/config';

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4));
"

echo "📥 Installing dependencies..."
pnpm install

echo "✅ File protocol setup complete!"
echo ""
echo "🚀 To start development:"
echo "  Terminal 1: cd ../saga-soa && turbo run dev --filter='@saga-soa/*'"
echo "  Terminal 2: cd saga-sm && pnpm dev"
echo ""
echo "📱 Applications will be available at:"
echo "  API Server: http://localhost:3000"
echo "  Web Client: http://localhost:3001"
echo ""
echo "ℹ️  Note: Changes in saga-soa packages will be reflected automatically due to file: protocol linking."