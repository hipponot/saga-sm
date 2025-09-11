/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',        // Enable static export for Amplify
    trailingSlash: true,     // Required for Amplify
    images: {
        unoptimized: true,   // Disable image optimization for static export
    },
    compiler: {
        styledComponents: false,
        emotion: false,
    },
    experimental: {
        forceSwcTransforms: true,
    },
    transpilePackages: [],
    turbopack: {
        rules: {
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js',
            },
        },
    },
    eslint: {
        // Disable Next.js built-in ESLint since we're using ESLint CLI
        ignoreDuringBuilds: true,
    },
}

module.exports = nextConfig