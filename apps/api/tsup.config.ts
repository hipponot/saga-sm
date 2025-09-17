import { defineConfig, type Options } from 'tsup'

export default defineConfig((options: Options) => ({
  entry: [
    'src/main.ts',
    'src/inversify.config.ts',
    'src/services/**/*.ts',
    'src/sectors/**/*.ts',
    '!src/sectors/**/*.test.ts',
    '!src/sectors/**/*.spec.ts',
    '!src/sectors/**/__tests__/**/*',
    'src/sectors/pubsub/trpc/pubsub-router.ts',
  ],
  clean: true,
  format: ['esm'],
  sourcemap: true,
  dts: true,
  outDir: 'dist',
  splitting: false,
  bundle: false,
  skipNodeModulesBundle: true,
  target: 'node18',
  minify: false,
  treeshake: true,
  ...options,
}))
