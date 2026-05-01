import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify deployment optimizations
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Security: Remove X-Powered-By header
  poweredByHeader: false,

  // React strict mode for development
  reactStrictMode: true,

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    resolveAlias: {
      // Optimize date-fns tree-shaking
      'date-fns': 'date-fns',
    },
  },

  // Experimental features for better Netlify compatibility
  experimental: {
    // Optimize package imports for smaller bundles
    optimizePackageImports: [
      'date-fns',
      'lucide-react',
    ],
  },
};

export default nextConfig;
