# Dependencies stage - for better layer caching
FROM node:18-alpine AS dependencies

WORKDIR /app

# Install pnpm (matching the version used in the project)
RUN npm install -g pnpm@8.15.4

# Copy workspace configuration first (best layer caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./

# Configure GitHub Packages registry for @hipponot packages
RUN echo '@hipponot:registry=https://npm.pkg.github.com' > .npmrc

# Copy pre-built API types (dist folder only)
COPY apps/api/types/dist/ ./apps/api/types/dist/

# Create minimal package.json for API types (production only)
RUN echo '{"name":"@saga-sm/api-types","version":"1.0.0","type":"module","private":true,"main":"./dist/index.js","types":"./dist/index.d.ts","exports":{".":{"types":"./dist/index.d.ts","default":"./dist/index.js"},"./schemas":{"types":"./dist/schemas/index.d.ts","default":"./dist/schemas/index.js"},"./generated":{"types":"./dist/generated/index.d.ts","default":"./dist/generated/index.js"}},"dependencies":{"zod":"^3.25.67"}}' > ./apps/api/types/package.json

# Copy web client package files
COPY apps/web-client/package.json apps/web-client/.npmrc ./apps/web-client/

# No need to fix package.json paths since we're using published packages

# Install ALL dependencies (this layer cached when package.json files don't change)
RUN pnpm install --no-frozen-lockfile

# Build stage
FROM dependencies AS builder

# Copy web client source code only after dependencies are installed
COPY apps/web-client/app/ ./apps/web-client/app/
COPY apps/web-client/src/ ./apps/web-client/src/
COPY apps/web-client/*.json ./apps/web-client/
COPY apps/web-client/*.ts ./apps/web-client/
COPY apps/web-client/eslint.config.mjs ./apps/web-client/
COPY apps/web-client/next.config.js ./apps/web-client/

# Set Docker environment variable to indicate containerized deployment
ENV DOCKER_ENV=true

# Use turbo to build with optimized dependency resolution
WORKDIR /app
RUN npx turbo build --filter=@saga-sm/web-client

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextuser -u 1001 -G nodejs

# Copy workspace configuration from builder
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/api/types/dist/ ./apps/api/types/dist/
COPY --from=builder /app/apps/web-client/package.json /app/apps/web-client/.npmrc ./apps/web-client/

# Recreate minimal package.json for API types and install dependencies
RUN echo '{"name":"@saga-sm/api-types","version":"1.0.0","type":"module","private":true,"main":"./dist/index.js","types":"./dist/index.d.ts","exports":{".":{"types":"./dist/index.d.ts","default":"./dist/index.js"},"./schemas":{"types":"./dist/schemas/index.d.ts","default":"./dist/schemas/index.js"},"./generated":{"types":"./dist/generated/index.d.ts","default":"./dist/generated/index.js"}},"dependencies":{"zod":"^3.25.67"}}' > ./apps/api/types/package.json && \
    echo '@hipponot:registry=https://npm.pkg.github.com' > .npmrc && \
    npm install -g pnpm@8.15.4 serve@14.2.3 && \
    pnpm install --prod --no-frozen-lockfile

# Copy built static application from builder stage with correct ownership
COPY --from=builder --chown=nextuser:nodejs /app/apps/web-client/out ./apps/web-client/out
COPY --from=builder --chown=nextuser:nodejs /app/apps/web-client/next.config.js ./apps/web-client/

# Set Docker environment variable to indicate containerized deployment
ENV DOCKER_ENV=true

# Switch to non-root user
USER nextuser

# Set working directory to web client
WORKDIR /app/apps/web-client

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "start"]
