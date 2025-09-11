# Optimized multi-stage Dockerfile for faster builds and smaller images
# Build context should be run from the parent directory of saga-sm and saga-soa

# Dependencies stage - for better layer caching
FROM node:18-alpine AS dependencies

WORKDIR /app

# Install pnpm (matching the version used in the project)
RUN npm install -g pnpm@8.15.4

# Copy workspace configuration first (best layer caching)
COPY saga-sm/pnpm-workspace.yaml saga-sm/package.json saga-sm/pnpm-lock.yaml saga-sm/turbo.json ./

# Copy all package.json files for dependency resolution
COPY saga-sm/apps/api/package.json ./apps/api/
COPY saga-sm/apps/api/types/package.json ./apps/api/types/

# Copy saga-soa packages (required dependencies)
COPY saga-soa/ ./saga-soa/

# Fix package.json paths for Docker build environment
RUN sed -i 's|file:../../../saga-soa/|file:../../saga-soa/|g' ./apps/api/package.json && \
    sed -i 's|file:../../../../saga-soa/|file:../../../saga-soa/|g' ./apps/api/types/package.json

# Install ALL dependencies (this layer cached when package.json files don't change)
RUN pnpm install --no-frozen-lockfile

# Build stage
FROM dependencies AS builder

# Copy source code only after dependencies are installed
COPY saga-sm/apps/api/src/ ./apps/api/src/
COPY saga-sm/apps/api/tsconfig.json saga-sm/apps/api/tsup.config.ts ./apps/api/
COPY saga-sm/apps/api/types/src/ ./apps/api/types/src/
COPY saga-sm/apps/api/types/tsconfig.json saga-sm/apps/api/types/tsup.config.ts saga-sm/apps/api/types/codegen.config.js ./apps/api/types/

# Use turbo to build with optimized dependency resolution
WORKDIR /app
RUN npx turbo build --filter=@saga-sm/api

# Production stage - smaller base image
FROM node:18-alpine AS production

WORKDIR /app

# Install only curl for health checks (using latest stable version)
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S apiuser -u 1001 -G nodejs

# Copy workspace files and saga-soa dependencies for production install
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/saga-soa/ ./saga-soa/
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/types/package.json ./apps/api/types/

# Install pnpm and production dependencies only
RUN npm install -g pnpm@8.15.4 && \
    sed -i 's|file:../../../saga-soa/|file:../../saga-soa/|g' ./apps/api/package.json && \
    sed -i 's|file:../../../../saga-soa/|file:../../../saga-soa/|g' ./apps/api/types/package.json && \
    pnpm install --prod --no-frozen-lockfile

# Copy built application
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./apps/api/dist

# Switch to non-root user
USER apiuser

# Set working directory
WORKDIR /app/apps/api

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/main.js"]
