import { EMBED_FRAME_ORIGINS } from '../constants/content-security-policy.constants';
import type { ContentSecurityPolicyOptions } from '../types/content-security-policy.types';

/**
 * No nonce: Cache Components prerenders the static shell once, so a per-request nonce cannot reach its inline
 * scripts (Next.js CSP guide). The policy still keeps scripts, frames and connections on known origins.
 */
export const buildContentSecurityPolicy = (options: ContentSecurityPolicyOptions): string => {
  const scriptSources = ["'self'", "'unsafe-inline'", ...(options.isDevelopment ? ["'unsafe-eval'"] : [])];
  const directives: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', scriptSources],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:', 'https:']],
    ['font-src', ["'self'", 'data:']],
    ['connect-src', ["'self'", new URL(options.collaborationUrl).origin]],
    ['frame-src', ["'self'", ...EMBED_FRAME_ORIGINS]],
    ['worker-src', ["'self'", 'blob:']],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', [options.frameAncestors]],
  ];
  return directives.map(([name, sources]) => `${name} ${sources.join(' ')}`).join('; ');
};
