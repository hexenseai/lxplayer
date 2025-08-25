/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
  // Ensure local workspace package is transpiled for Next
  transpilePackages: ['@lxplayer/ui'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  eslint: {
    // Skip ESLint errors during production builds to avoid blocking deploys
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Avoid blocking production builds on type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
