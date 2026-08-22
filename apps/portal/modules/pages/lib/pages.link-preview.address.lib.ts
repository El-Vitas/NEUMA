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

/**
 * Whether an address belongs to the network the server itself lives in.
 *
 * These ranges are not on the public internet, so a page that names one is not
 * asking about a link somebody could have followed: it is asking the server to
 * reach somewhere only the server can reach.
 */
const isAddressOfOurOwnNetwork = (parts: readonly number[]): boolean => {
  const [first = 0, second = 0] = parts;
  if (first === 10 || first === 127 || first === 0) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 169 && second === 254) return true;
  return first === 100 && second >= 64 && second <= 127;
};

/**
 * Whether the server may ask this address what a link says about itself.
 *
 * The question is asked by the server, so anything the server can reach is
 * fair game unless it is refused here — the machine itself, the network around
 * it, and the address where a cloud hands out its own credentials. Names that
 * resolve only inside are refused too, since a name is the easiest way to hide
 * one of those addresses.
 *
 * This reads the address as written. A name that resolves to a private address
 * still gets through, so the caller must ask this again at every redirect
 * rather than trusting the first answer.
 */
export const isReachableLinkPreviewAddress = (address: string): boolean => {
  if (!URL.canParse(address)) return false;
  const url = new URL(address);
  if (url.protocol !== LINK_PREVIEW_ALLOWED_PROTOCOL) return false;

  const host = url.hostname.toLowerCase().replace(/^\[|]$/g, '');
  if (LINK_PREVIEW_CLOSED_HOSTS.includes(host)) return false;
  if (LINK_PREVIEW_CLOSED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return false;

  const parts = readIpv4Parts(host);
  return parts === null ? true : !isAddressOfOurOwnNetwork(parts);
};
