import path from 'node:path';
import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];

const monorepoRoot = path.join(import.meta.dirname, '../../');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  cacheComponents: true,
  logging: {
    serverFunctions: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// biome-ignore lint/style/noProcessEnv: next.config.ts needs process.env for conditional bundle analyzer
export default process.env.ANALYZE === 'true' ? withBundleAnalyzer({ enabled: true })(nextConfig) : nextConfig;
