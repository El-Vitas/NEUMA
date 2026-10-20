import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { env } from './config/env.config';
import {
  FRAME_ANCESTORS_NONE,
  FRAME_ANCESTORS_SAME_ORIGIN,
} from './shared/constants/content-security-policy.constants';
import { buildContentSecurityPolicy } from './shared/lib/content-security-policy.lib';

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

const contentSecurityPolicyFor = (frameAncestors: string): string =>
  buildContentSecurityPolicy({
    collaborationUrl: env.NEXT_PUBLIC_LIVE_WS_URL,
    frameAncestors,
    isDevelopment: env.NODE_ENV === 'development',
  });

/** Attachments allow same-origin framing because the browser's document viewer renders them in a frame. */
const framingHeaders = [
  { frameAncestors: FRAME_ANCESTORS_NONE, source: `/((?!${attachmentsPath}).*)`, value: 'DENY' },
  { frameAncestors: FRAME_ANCESTORS_SAME_ORIGIN, source: `/${attachmentsPath}/:path*`, value: 'SAMEORIGIN' },
].map(({ frameAncestors, source, value }) => ({
  headers: [
    { key: 'X-Frame-Options', value },
    { key: 'Content-Security-Policy', value: contentSecurityPolicyFor(frameAncestors) },
  ],
  source,
}));

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
