# Saga-SM Development Guide

## Dependency Management

Saga-SM depends on packages from the `saga-soa` monorepo. To facilitate development, we provide a flexible system to switch between local development and published packages.

### Quick Setup

```bash
# For local development (recommended for saga-soa development)
./scripts/dev-setup.sh local

# For CI-like environment (uses published packages)
./scripts/dev-setup.sh ci

# Check current status
./scripts/dev-setup.sh status
```

### Dependency Modes

#### 🏠 Local Mode (Default)
- Uses `file:` dependencies pointing to `../saga-soa/packages/*`
- Allows real-time development of saga-soa packages
- Requires saga-soa to be cloned as a sibling directory
- Best for: Developing features that span both saga-sm and saga-soa

#### 🌐 Published Mode
- Uses published `@hipponot/*` packages from GitHub Packages
- Mirrors CI/CD environment exactly
- Requires `GITHUB_TOKEN` environment variable
- Best for: Testing saga-sm in isolation, reproducing CI issues

### Manual Switching

```bash
# Switch to local file: dependencies
./scripts/switch-saga-soa-deps.sh local

# Switch to published packages (requires GITHUB_TOKEN)
./scripts/switch-saga-soa-deps.sh published

# Preview changes without applying them
./scripts/switch-saga-soa-deps.sh published --dry-run

# Check current mode
./scripts/switch-saga-soa-deps.sh
```

### Configuration

Dependencies are configured in `.saga-soa-deps.json`:

```json
{
  "packages": {
    "apps/api": {
      "dependencies": {
        "@hipponot/api-core": {
          "local": "file:../../../saga-soa/packages/api-core",
          "published": "^1.0.0"
        }
      }
    }
  }
}
```

### Environment Variables

For published mode, set your GitHub token:
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

**Getting your GitHub token:**
- Quick setup: See `GITHUB_TOKEN_SETUP.md`
- Full guide: See `DOCKER_AUTHENTICATION.md`
- Command: `export GITHUB_TOKEN=$(gh auth token)` (requires GitHub CLI)

### Development Workflow

#### Working on saga-sm only:
```bash
./scripts/dev-setup.sh ci      # Use published packages
pnpm install
pnpm test
```

#### Working on both saga-sm and saga-soa:
```bash
./scripts/dev-setup.sh local   # Use local file: dependencies
# Make changes to saga-soa packages
cd ../saga-soa && pnpm build
cd ../saga-sm && pnpm test     # Test with your saga-soa changes
```

#### Testing CI behavior locally:
```bash
./scripts/dev-setup.sh ci      # Match CI environment
pnpm test                      # Should behave like CI
```

### CI/CD

The GitHub Actions workflow automatically uses published packages:
- Switches to published mode using `./scripts/switch-saga-soa-deps.sh published`
- Configures GitHub Packages registry
- Installs dependencies from published packages

### Troubleshooting

**"No saga-soa directory found"**
- Ensure saga-soa is cloned as `../saga-soa` relative to saga-sm
- Or use published mode: `./scripts/dev-setup.sh ci`

**"GITHUB_TOKEN required"** or **"403 Forbidden"**
- Set the environment variable: `export GITHUB_TOKEN=$(gh auth token)` 
- Ensure token has `read:packages` scope: `gh auth refresh --hostname github.com --scopes "repo,read:packages"`
- Or use local mode: `./scripts/dev-setup.sh local`

**Docker build authentication issues**
- For Docker builds: Ensure `GITHUB_TOKEN` is exported before running `docker-compose build`
- See `DOCKER_AUTHENTICATION.md` for complete Docker setup guide

**Dependency resolution errors**
- Try clearing lock files: `rm pnpm-lock.yaml && pnpm install`
- Check dependency mode: `./scripts/dev-setup.sh status`

**Stale builds**
- For local mode: `./scripts/build-saga-soa.sh` to rebuild saga-soa
- For published mode: ensure latest packages are published

### Adding New Dependencies

1. Update `.saga-soa-deps.json` with local and published versions
2. Test both modes:
   ```bash
   ./scripts/switch-saga-soa-deps.sh local --dry-run
   ./scripts/switch-saga-soa-deps.sh published --dry-run
   ```
3. Update package.json files in the desired mode
4. Test and commit

This system ensures smooth development flow while maintaining CI/CD compatibility!