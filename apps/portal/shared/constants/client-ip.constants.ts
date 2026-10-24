import type { ClientIpTrust } from '@/shared/types/client-ip.types';

/** Without configuration one proxy hop is believed and the Cloudflare header is not. */
export const DEFAULT_CLIENT_IP_TRUST: ClientIpTrust = { trustedProxyCount: 1, trustsCloudflareHeader: false };

/** Set by Cloudflare at the edge, which overwrites whatever the browser sent. */
export const CLOUDFLARE_CLIENT_IP_HEADER = 'cf-connecting-ip';
export const FORWARDED_FOR_HEADER = 'x-forwarded-for';
/** Digits, hex letters, dots and colons cover IPv4 and IPv6; the longest IPv6 text form is 45 characters. */
export const CLIENT_IP_PATTERN = /^[0-9A-Fa-f:.]{2,45}$/;
