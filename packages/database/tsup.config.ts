import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/client.ts'],
    format: ['esm'],
    dts: false,  // Disable DTS generation due to Prisma's complex TypeScript syntax
    clean: true,
    sourcemap: false,
    // Mark everything from generated as external to prevent bundling
    external: [
        // Don't bundle the generated Prisma client
        '../generated/prisma',
        '../generated/prisma/index',
        '../generated/prisma/runtime/library',
        // Node built-ins
        'fs',
        'path',
        'crypto',
        'os',
        'util',
        'node:fs',
        'node:path',
        'node:crypto',
        'node:os',
        'node:util'
    ],
    noExternal: [], // Don't bundle any dependencies
    platform: 'node',
    target: 'node20',
    outDir: 'dist',
    // Skip minification to preserve require statements
    minify: false,
    // Don't bundle, just transpile
    bundle: false,
    // Keep the ESM format
    splitting: false
});
