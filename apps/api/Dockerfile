# Dockerfile for published packages (@hipponot from GitHub Packages)
# Build context should be run from the saga-sm directory
# Usage: docker build -f apps/api/Dockerfile -t saga-sm-api:latest --build-arg GITHUB_TOKEN=your_token .

# Dependencies stage - for better layer caching
FROM node:20-alpine AS dependencies

# Accept GitHub token for private package access
ARG GITHUB_TOKEN

WORKDIR /app

# Install pnpm (matching the version used in the project)
RUN npm install -g pnpm@8.15.4

# Copy workspace configuration first (best layer caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./

# Copy all package.json files for dependency resolution
COPY apps/api/package.json apps/api/.npmrc ./apps/api/
COPY packages/ ./packages/

# Configure GitHub Packages registry for @hipponot packages
RUN echo '@hipponot:registry=https://npm.pkg.github.com' > .npmrc && \
    if [ -n "$GITHUB_TOKEN" ]; then \
        echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" >> .npmrc; \
    else \
        echo "//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}" >> .npmrc; \
    fi

# No need to fix package.json paths since we're using published packages

# Install ALL dependencies (this layer cached when package.json files don't change)
RUN pnpm install --no-frozen-lockfile

# Build stage
FROM dependencies AS builder

# Copy source code only after dependencies are installed
COPY apps/api/src/ ./apps/api/src/
COPY apps/api/tsconfig.json apps/api/tsup.config.ts ./apps/api/
# Copy database sources and schema
COPY packages/database/src/ ./packages/database/src/
COPY packages/database/prisma/ ./packages/database/prisma/
# Copy api-types package sources
COPY packages/api-types/src/ ./packages/api-types/src/
COPY packages/api-types/tsconfig.json packages/api-types/tsup.config.ts packages/api-types/codegen.config.js ./packages/api-types/

# Generate Prisma client and build with turbo
WORKDIR /app
RUN cd packages/database && npx prisma generate && cd ../.. && \
    npx turbo build --filter=@saga-sm/api

# Production stage - smaller base image
FROM node:20-alpine AS production

# Accept GitHub token for private package access
ARG GITHUB_TOKEN

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

# Install pnpm and production dependencies only
RUN npm install -g pnpm@8.15.4 && \
    echo '@hipponot:registry=https://npm.pkg.github.com' > .npmrc && \
    if [ -n "$GITHUB_TOKEN" ]; then \
        echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" >> .npmrc; \
    else \
        echo "//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}" >> .npmrc; \
    fi && \
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
