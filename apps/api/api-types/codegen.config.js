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
    // Enhanced zod2ts now handles TypeScript files directly
    zod2ts: {
        enabled: true,
        outputDir: './types',
    },
}
