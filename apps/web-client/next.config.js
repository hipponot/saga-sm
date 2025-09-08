/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [],
    experimental: {
        turbo: {
            rules: {
                '*.svg': {
                    loaders: ['@svgr/webpack'],
                    as: '*.js',
                },
            },
        },
    },
}

module.exports = nextConfig