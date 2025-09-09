import { defineConfig, type Options } from 'tsup'

export default defineConfig((options: Options) => ({
    entry: ['src/main.ts', 'src/inversify.config.ts', 'src/sectors/**/*', 'src/sectors/pubsub/trpc/pubsub-router.ts'],
    clean: true,
    format: ['esm'],
    sourcemap: true,
    dts: false,
    outDir: 'dist',
    splitting: false,
    skipNodeModulesBundle: true,
    target: 'node18',
    minify: false,
    treeshake: true,
    ...options
}))