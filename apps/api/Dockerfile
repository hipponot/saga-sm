# Optimized multi-stage Dockerfile for faster builds and smaller images
# Build context should be run from the saga-sm directory

# Dependencies stage - for better layer caching
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install pnpm (matching the version used in the project)
RUN npm install -g pnpm@8.15.4

# Copy workspace configuration first (best layer caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./

# Copy all package.json files for dependency resolution
COPY apps/api/package.json apps/api/.npmrc ./apps/api/
COPY apps/api/types/package.json apps/api/types/.npmrc ./apps/api/types/
COPY packages/ ./packages/

# Configure GitHub Packages registry for @hipponot packages
RUN echo '@hipponot:registry=https://npm.pkg.github.com' > .npmrc

# No need to fix package.json paths since we're using published packages

# Install ALL dependencies (this layer cached when package.json files don't change)
RUN pnpm install --no-frozen-lockfile

# Build stage
FROM dependencies AS builder

# Copy source code only after dependencies are installed
COPY apps/api/src/ ./apps/api/src/
COPY apps/api/tsconfig.json apps/api/tsup.config.ts ./apps/api/
COPY apps/api/types/src/ ./apps/api/types/src/
COPY apps/api/types/tsconfig.json apps/api/types/tsup.config.ts apps/api/types/codegen.config.js ./apps/api/types/
# Copy database sources and schema
COPY packages/database/src/ ./packages/database/src/
COPY packages/database/prisma/ ./packages/database/prisma/

# Generate Prisma client and build with turbo
WORKDIR /app
RUN cd packages/database && npx prisma generate && cd ../.. && \
    npx turbo build --filter=@saga-sm/api

# Production stage - smaller base image
FROM node:20-alpine AS production

WORKDIR /app

# Install only curl for health checks (using latest stable version)
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S apiuser -u 1001 -G nodejs

# Copy workspace files for production install
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/api/package.json /app/apps/api/.npmrc ./apps/api/
COPY --from=builder /app/apps/api/types/package.json /app/apps/api/types/.npmrc ./apps/api/types/

# Install pnpm and production dependencies only
RUN npm install -g pnpm@8.15.4 && \
    echo '@hipponot:registry=https://npm.pkg.github.com' > .npmrc && \
    pnpm install --prod --no-frozen-lockfile

# Copy built application and generated Prisma client
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=apiuser:nodejs /app/packages/database/generated ./packages/database/generated
COPY --from=builder --chown=apiuser:nodejs /app/packages/database/dist ./packages/database/dist

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
