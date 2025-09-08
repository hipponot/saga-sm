import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/main.ts'],
    format: ['esm'],
    target: 'node18',
    sourcemap: true,
    clean: true,
    dts: true,
    minify: false,
    splitting: false,
    treeshake: true,
    outDir: 'dist'
})