import {
  LINK_PREVIEW_ALLOWED_PROTOCOL,
  LINK_PREVIEW_CLOSED_HOST_SUFFIXES,
  LINK_PREVIEW_CLOSED_HOSTS,
  LINK_PREVIEW_IPV4_SHAPE,
} from '../constants/pages.link-preview.constants';

const readIpv4Parts = (host: string): null | readonly number[] => {
  const parts = LINK_PREVIEW_IPV4_SHAPE.exec(host);
  if (parts === null) return null;
  const numbers = parts.slice(1).map(Number);
  return numbers.every((part) => part <= 255) ? numbers : null;
};

const isAddressOfOurOwnNetwork = (parts: readonly number[]): boolean => {
  const [first = 0, second = 0] = parts;
  if (first === 10 || first === 127 || first === 0) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 169 && second === 254) return true;
  return first === 100 && second >= 64 && second <= 127;
};

/**
 * Guards the server-side fetch against requests to loopback, private and cloud-metadata addresses.
 * It checks the address as written, so a hostname resolving to a private address still passes:
 * callers must check again at every redirect.
 */
export const isReachableLinkPreviewAddress = (address: string): boolean => {
  if (!URL.canParse(address)) return false;
  const url = new URL(address);
  if (url.protocol !== LINK_PREVIEW_ALLOWED_PROTOCOL) return false;

  const host = url.hostname.toLowerCase().replaceAll(/^\[|]$/g, '');
  if (LINK_PREVIEW_CLOSED_HOSTS.includes(host)) return false;
  if (LINK_PREVIEW_CLOSED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return false;

  const parts = readIpv4Parts(host);
  return parts === null ? true : !isAddressOfOurOwnNetwork(parts);
};
