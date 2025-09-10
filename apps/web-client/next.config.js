/** @type {import('next').NextConfig} */
const nextConfig = {
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