import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL: 'postgresql://saga_user:password123@localhost:5432/saga_sm',
      MONGODB_URI: 'mongodb://admin:password123@localhost:27017/saga_sm?authSource=admin',
    },
    sequence: {
      concurrent: false,
    },
  },
});
