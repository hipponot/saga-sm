# Dependency Management

Managing saga-soa dependencies in local vs published modes.

## Quick Reference

```bash
# Switch to local development mode
./scripts/dev-setup.sh local

# Switch to published packages mode
./scripts/dev-setup.sh ci

# Check current status
./scripts/dev-setup.sh status

# Manual switching
./scripts/switch-saga-soa-deps.sh local
./scripts/switch-saga-soa-deps.sh published
```

## Dependency Modes

### 🏠 Local Mode (Default)

**Best for:** Developing features that span both saga-sm and saga-soa

- Uses `file:` dependencies pointing to `../saga-soa/packages/*`
- Allows real-time development of saga-soa packages
- Requires saga-soa to be cloned as a sibling directory
- Changes in saga-soa are reflected immediately

**Setup:**
```bash
./scripts/dev-setup.sh local
pnpm install
```

### 🌐 Published Mode

**Best for:** Testing saga-sm in isolation, reproducing CI issues

- Uses published `@hipponot/*` packages from GitHub Packages
- Mirrors CI/CD environment exactly
- Requires `GITHUB_TOKEN` environment variable
- Tests against stable published versions

**Setup:**
```bash
# Requires GitHub token
export GITHUB_TOKEN=$(gh auth token)
./scripts/dev-setup.sh ci
pnpm install
```

## Directory Structure

For local mode, ensure this structure:

```
dev/
├── saga-soa/          # Shared infrastructure (clone first)
│   └── packages/      # @hipponot/* packages
└── saga-sm/           # This project
    └── apps/api/      # Uses file:../../../saga-soa/packages/*
```

## Configuration File

Dependencies are managed via `.saga-soa-deps.json`:

```json
{
  "packages": {
    "apps/api": {
      "dependencies": {
        "@hipponot/api-core": {
          "local": "file:../../../saga-soa/packages/api-core",
          "published": "^1.0.4"
        },
        "@hipponot/db": {
          "local": "file:../../../saga-soa/packages/db",
          "published": "^1.0.3"
        }
      }
    }
  }
}
```

## Development Workflows

### Working on saga-sm only:
```bash
./scripts/dev-setup.sh ci      # Use published packages
pnpm install
pnpm test
```

### Working on both saga-sm and saga-soa:
```bash
./scripts/dev-setup.sh local   # Use local file: dependencies
# Make changes to saga-soa packages
cd ../saga-soa && pnpm build
cd ../saga-sm && pnpm test     # Test with your saga-soa changes
```

### Testing CI behavior locally:
```bash
./scripts/dev-setup.sh ci      # Match CI environment
pnpm test                      # Should behave like CI
```

## Switching Between Modes

### Automatic (Recommended)
```bash
# Sets up environment + switches dependencies
./scripts/dev-setup.sh local
./scripts/dev-setup.sh ci
```

### Manual
```bash
# Just switch dependencies (no environment setup)
./scripts/switch-saga-soa-deps.sh local
./scripts/switch-saga-soa-deps.sh published

# Preview changes without applying
./scripts/switch-saga-soa-deps.sh published --dry-run
```

## Troubleshooting

### "No saga-soa directory found"
- Ensure saga-soa is cloned as `../saga-soa` relative to saga-sm
- Or use published mode: `./scripts/dev-setup.sh ci`

### "GITHUB_TOKEN required" or "403 Forbidden"
- Set the environment variable: `export GITHUB_TOKEN=$(gh auth token)` 
- Ensure token has `read:packages` scope
- Or use local mode: `./scripts/dev-setup.sh local`

### Dependency resolution errors
- Clear lock files: `rm pnpm-lock.yaml && pnpm install`
- Check current mode: `./scripts/dev-setup.sh status`
- Rebuild saga-soa: `./scripts/build-saga-soa.sh` (local mode)

### Stale builds in local mode
```bash
cd ../saga-soa
pnpm build
cd ../saga-sm
pnpm build
```

## CI/CD Integration

GitHub Actions automatically uses published packages:
- Switches to published mode: `./scripts/switch-saga-soa-deps.sh published`
- Configures GitHub Packages registry
- Installs dependencies from published packages

## Adding New Dependencies

1. Update `.saga-soa-deps.json` with local and published versions
2. Test both modes:
   ```bash
   ./scripts/switch-saga-soa-deps.sh local --dry-run
   ./scripts/switch-saga-soa-deps.sh published --dry-run
   ```
3. Update package.json files in the desired mode
4. Test and commit

## Related

- [GitHub Setup](GITHUB_SETUP.md) - Token setup for published packages
- [Environment Setup](ENVIRONMENT_SETUP.md) - Complete environment configuration