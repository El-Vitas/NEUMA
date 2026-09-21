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

/** Where the files a page holds are handed over. */
const attachmentsPath = 'api/page-assets';

/**
 * Nothing of this application may be put in a frame, anywhere.
 *
 * The one exception is the attachments themselves, and only inside this same
 * origin: a document shown on a page is drawn by the browser's own viewer,
 * which reads it in a frame of its own. Denying that frame denies the viewer,
 * and the page shows an empty box instead of the document.
 */
const framingHeaders = [
  { source: `/((?!${attachmentsPath}).*)`, value: 'DENY' },
  { source: `/${attachmentsPath}/:path*`, value: 'SAMEORIGIN' },
].map(({ source, value }) => ({ headers: [{ key: 'X-Frame-Options', value }], source }));

const monorepoRoot = path.join(import.meta.dirname, '../../');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  /**
   * How much a server action may be handed at once.
   *
   * Files reach the server through actions, and the pages promise ten megabytes
   * of them; the default of one would refuse most of what the interface offers
   * to accept, and refuse it by throwing rather than by saying so. The margin
   * above ten is what the encoding of the file itself costs on the way.
   */
  experimental: {
    serverActions: { bodySizeLimit: '12mb' },
    /**
     * The build stays on Bun, and the persistent Turbopack cache that Next 16.3
     * turned on by default makes `bun --bun next build` crash with a segfault.
     * Turned off until the two get along; only the build cache is given up, and
     * the dev one —which is what keeps memory in check— stays on.
     */
    turbopackFileSystemCacheForBuild: false,
    /**
     * The type checker Next 16.3 reaches for lives in `typescript/bin/tsc`, and
     * the compiler this repository installs (`@typescript/typescript6`) does not
     * ship that file. Typechecking runs on its own through `bun run typecheck`.
     */
    useTypeScriptCli: false,
  },
  /**
   * The manual is written in files rather than in the code, and files nothing
   * imports are not carried into what gets deployed unless they are named here.
   */
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
