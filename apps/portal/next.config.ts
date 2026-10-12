import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

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
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];

const attachmentsPath = 'api/page-assets';

/** Attachments allow same-origin framing because the browser's document viewer renders them in a frame. */
const framingHeaders = [
  { source: `/((?!${attachmentsPath}).*)`, value: 'DENY' },
  { source: `/${attachmentsPath}/:path*`, value: 'SAMEORIGIN' },
].map(({ source, value }) => ({ headers: [{ key: 'X-Frame-Options', value }], source }));

const monorepoRoot = path.join(import.meta.dirname, '../../');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  experimental: {
    // Files travel through server actions and the UI accepts 10 MB; the margin covers encoding overhead.
    serverActions: { bodySizeLimit: '12mb' },
    // The persistent Turbopack build cache makes `bun --bun next build` segfault.
    turbopackFileSystemCacheForBuild: false,
    // Next looks for `typescript/bin/tsc`, which `@typescript/typescript6` does not ship.
    useTypeScriptCli: false,
  },
  // Nothing imports the docs content files, so tracing would drop them from the deployment.
  outputFileTracingIncludes: { '/[locale]/(portal)/docs/**': ['./content/docs/**/*'] },
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
      ...framingHeaders,
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
