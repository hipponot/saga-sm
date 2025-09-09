/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [],
    // Enable static export for Amplify hosting
    output: 'export',
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    // Set workspace root to silence the warning
    outputFileTracingRoot: '~/dev/saga-sm',
}

module.exports = nextConfig