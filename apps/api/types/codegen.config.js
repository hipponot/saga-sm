export default {
    // Source configuration
    source: {
        sectorsDir: '../src/sectors',
        routerPattern: '*/trpc/*-router.ts',
        schemaPattern: '*/trpc/schema/*-schemas.ts',
    },

    // Generation configuration
    generation: {
        outputDir: './generated',
        packageName: '@saga-sm/api-types',
        routerName: 'ApiRouter',
    },

    // Parsing configuration
    parsing: {
        endpointPattern: /^\s*(\w+):\s*t\s*(?:\.input\((\w+Schema)\))?\s*\.(query|mutation)\(/gm,
        routerMethodPattern:
            /createRouter\(\s*\):\s*[^{]*\{[\s\S]*?return\s+router\(\s*\{([\s\S]*?)\}\s*\)\s*;?\s*\}/,
    },

    // Zod2ts configuration
    // Disabled due to ES module loading issue - "Unexpected token 'export'"
    // The zod2ts tool needs to be updated to use dynamic import() instead of require()
    // Core type generation with Z suffix naming is working correctly
    zod2ts: {
        enabled: false,
        outputDir: './types',
    },
}
