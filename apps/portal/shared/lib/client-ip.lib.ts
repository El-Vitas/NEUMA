import {
  CLIENT_IP_PATTERN,
  CLOUDFLARE_CLIENT_IP_HEADER,
  FORWARDED_FOR_HEADER,
} from '@/shared/constants/client-ip.constants';

const firstForwardedAddress = (forwardedFor: string | null): string | undefined =>
  forwardedFor?.split(',').at(0)?.trim();

/**
 * The address of the person behind the request, so the backend's per-IP limits count people and not the portal.
 * Anything that does not look like an address is dropped rather than forwarded.
 */
export const readClientIp = (incoming: Headers): string | undefined => {
  const candidate =
    incoming.get(CLOUDFLARE_CLIENT_IP_HEADER)?.trim() ?? firstForwardedAddress(incoming.get(FORWARDED_FOR_HEADER));
  return candidate !== undefined && CLIENT_IP_PATTERN.test(candidate) ? candidate : undefined;
};

export const forwardedForHeaders = (clientIp: string | undefined): Record<string, string> =>
  clientIp === undefined ? {} : { [FORWARDED_FOR_HEADER]: clientIp };
