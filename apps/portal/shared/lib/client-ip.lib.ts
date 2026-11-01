import {
  CLIENT_IP_PATTERN,
  CLOUDFLARE_CLIENT_IP_HEADER,
  DEFAULT_CLIENT_IP_TRUST,
  FORWARDED_FOR_HEADER,
} from '@/shared/constants/client-ip.constants';
import type { ClientIpTrust } from '@/shared/types/client-ip.types';

/** Proxies append on the right, so only the entries our own proxies wrote can be believed. */
const forwardedAddressFromTheRight = (forwardedFor: string | null, trustedProxyCount: number): string | undefined => {
  if (trustedProxyCount < 1) return undefined;
  return forwardedFor?.split(',').at(-trustedProxyCount)?.trim();
};

/**
 * The address of the person behind the request, so the backend's per-IP limits count people and not the portal.
 * Anything that does not look like an address is dropped rather than forwarded.
 */
export const readClientIp = (incoming: Headers, trust: ClientIpTrust = DEFAULT_CLIENT_IP_TRUST): string | undefined => {
  const cloudflareAddress = trust.trustsCloudflareHeader
    ? incoming.get(CLOUDFLARE_CLIENT_IP_HEADER)?.trim()
    : undefined;
  const candidate =
    cloudflareAddress ?? forwardedAddressFromTheRight(incoming.get(FORWARDED_FOR_HEADER), trust.trustedProxyCount);
  return candidate !== undefined && CLIENT_IP_PATTERN.test(candidate) ? candidate : undefined;
};

export const forwardedForHeaders = (clientIp: string | undefined): Record<string, string> =>
  clientIp === undefined ? {} : { [FORWARDED_FOR_HEADER]: clientIp };
