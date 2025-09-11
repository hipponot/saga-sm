# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy workspace configuration and dependencies (from saga-sm directory)
COPY saga-sm/pnpm-workspace.yaml saga-sm/package.json saga-sm/pnpm-lock.yaml ./

# Copy saga-soa packages (sibling directory)
COPY saga-soa/ ./saga-soa/

# Copy API package files and dependencies
COPY saga-sm/apps/api/package.json ./apps/api/
COPY saga-sm/apps/api/types/ ./apps/api/types/

# Fix package.json paths for Docker build environment
RUN sed -i 's|file:../../../saga-soa/|file:../../saga-soa/|g' ./apps/api/package.json
RUN sed -i 's|file:../../../../saga-soa/|file:../../../saga-soa/|g' ./apps/api/types/package.json

# Install all dependencies
RUN pnpm install --no-frozen-lockfile

# Copy API source code
COPY saga-sm/apps/api/src/ ./apps/api/src/
COPY saga-sm/apps/api/tsconfig.json saga-sm/apps/api/tsup.config.ts ./apps/api/

# Build the application
WORKDIR /app/apps/api
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install curl for health checks and pnpm
RUN apk add --no-cache curl && npm install -g pnpm@9.0.0

# Copy workspace configuration (from saga-sm directory)
COPY saga-sm/pnpm-workspace.yaml saga-sm/package.json saga-sm/pnpm-lock.yaml ./

# Copy saga-soa packages (sibling directory)
COPY saga-soa/ ./saga-soa/

# Copy API package.json and dependencies
COPY saga-sm/apps/api/package.json ./apps/api/
COPY saga-sm/apps/api/types/ ./apps/api/types/

# Fix package.json paths for Docker build environment
RUN sed -i 's|file:../../../saga-soa/|file:../../saga-soa/|g' ./apps/api/package.json
RUN sed -i 's|file:../../../../saga-soa/|file:../../../saga-soa/|g' ./apps/api/types/package.json

# Create non-root user first
RUN addgroup -g 1001 -S nodejs
RUN adduser -S apiuser -u 1001 -G nodejs

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --prod

# Create apps/api directory structure
RUN mkdir -p /app/apps/api

# Copy built application from builder stage with correct ownership
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./apps/api/dist

USER apiuser

# Set working directory to API
WORKDIR /app/apps/api

# Expose port
EXPOSE 3000

# Health check using curl
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["pnpm", "start"]
