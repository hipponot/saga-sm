# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy workspace configuration and dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy saga-soa packages
COPY saga-soa/ ./saga-soa/

# Copy web client package files
COPY apps/web-client/package.json ./apps/web-client/

# Fix package.json paths for Docker build environment (if any saga-soa deps exist)
RUN sed -i 's|file:../../../saga-soa/|file:../../saga-soa/|g' ./apps/web-client/package.json || true

# Install all dependencies
RUN pnpm install --no-frozen-lockfile

# Copy web client source code (excluding node_modules) 
COPY apps/web-client/app/ ./apps/web-client/app/
COPY apps/web-client/src/ ./apps/web-client/src/
COPY apps/web-client/*.json ./apps/web-client/
COPY apps/web-client/*.ts ./apps/web-client/
COPY apps/web-client/eslint.config.js ./apps/web-client/
COPY apps/web-client/next.config.js ./apps/web-client/

# Set Docker environment variable to disable static export
ENV DOCKER_ENV=true

# Build the application
WORKDIR /app/apps/web-client
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy saga-soa packages
COPY saga-soa/ ./saga-soa/

# Copy web client package.json
COPY apps/web-client/package.json ./apps/web-client/

# Fix package.json paths for Docker build environment (if any saga-soa deps exist)
RUN sed -i 's|file:../../../saga-soa/|file:../../saga-soa/|g' ./apps/web-client/package.json || true

# Create non-root user first
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextuser -u 1001 -G nodejs

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --prod

# Create apps/web-client directory structure
RUN mkdir -p /app/apps/web-client

# Copy built application from builder stage with correct ownership
COPY --from=builder --chown=nextuser:nodejs /app/apps/web-client/.next ./apps/web-client/.next
COPY --from=builder --chown=nextuser:nodejs /app/apps/web-client/next.config.js ./apps/web-client/
COPY --from=builder --chown=nextuser:nodejs /app/apps/web-client/package.json ./apps/web-client/

# Set Docker environment variable to disable static export
ENV DOCKER_ENV=true

USER nextuser

# Set working directory to web client
WORKDIR /app/apps/web-client

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "start"]
