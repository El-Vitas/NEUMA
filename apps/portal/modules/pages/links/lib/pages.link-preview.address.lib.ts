import { isIP } from 'node:net';
import {
  LINK_PREVIEW_BYTE_RANGE as BYTE_RANGE,
  LINK_PREVIEW_IPV6_6TO4_PREFIX as IPV6_6TO4_PREFIX,
  LINK_PREVIEW_IPV6_GLOBAL_MASK as IPV6_GLOBAL_MASK,
  LINK_PREVIEW_IPV6_GLOBAL_PREFIX as IPV6_GLOBAL_PREFIX,
  LINK_PREVIEW_IPV6_GROUP_MAXIMUM as IPV6_GROUP_MAXIMUM,
  LINK_PREVIEW_IPV6_GROUP_RADIX as IPV6_GROUP_RADIX,
  LINK_PREVIEW_IPV6_GROUPS as IPV6_GROUPS,
  LINK_PREVIEW_IPV6_MAPPED_MARKER as IPV6_MAPPED_MARKER,
  LINK_PREVIEW_IPV6_NAT64_MARKER as IPV6_NAT64_MARKER,
  LINK_PREVIEW_IPV6_TEREDO_PREFIX as IPV6_TEREDO_PREFIX,
  LINK_PREVIEW_ALLOWED_PORT,
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
  const [first = 0, second = 0, third = 0] = parts;
  if (first === 10 || first === 127 || first === 0 || first >= 224) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 169 && second === 254) return true;
  if (first === 192 && second === 0 && third === 0) return true;
  if (first === 198 && (second === 18 || second === 19)) return true;
  return first === 100 && second >= 64 && second <= 127;
};

const expandIpv6Tail = (tail: string): number[] | null => {
  if (tail === '') return [];
  const pieces = tail.split(':');
  const groups: number[] = [];
  for (const [index, piece] of pieces.entries()) {
    const isLast = index === pieces.length - 1;
    const embedded = isLast ? readIpv4Parts(piece) : null;
    if (embedded !== null) {
      const [a = 0, b = 0, c = 0, d = 0] = embedded;
      groups.push(a * BYTE_RANGE + b, c * BYTE_RANGE + d);
      continue;
    }
    groups.push(Number.parseInt(piece, IPV6_GROUP_RADIX));
  }
  return groups.every((group) => Number.isInteger(group) && group >= 0 && group <= IPV6_GROUP_MAXIMUM) ? groups : null;
};

const readIpv6Groups = (host: string): number[] | null => {
  const halves = host.split('::');
  if (halves.length > 2) return null;
  const head = expandIpv6Tail(halves[0] ?? '');
  const tail = expandIpv6Tail(halves[1] ?? '');
  if (head === null || tail === null) return null;
  if (halves.length === 1) return head.length === IPV6_GROUPS ? head : null;
  const missing = IPV6_GROUPS - head.length - tail.length;
  return missing < 1 ? null : [...head, ...new Array<number>(missing).fill(0), ...tail];
};

const readIpv4FromGroups = (high: number, low: number): readonly number[] => [
  Math.floor(high / BYTE_RANGE),
  high % BYTE_RANGE,
  Math.floor(low / BYTE_RANGE),
  low % BYTE_RANGE,
];

const isPublicIpv6 = (groups: readonly number[]): boolean => {
  const [first = 0, second = 0, third = 0, , , sixth = 0, seventh = 0, eighth = 0] = groups;
  const leadingAreZero = groups.slice(0, 5).every((group) => group === 0);
  if (leadingAreZero && (sixth === IPV6_MAPPED_MARKER || sixth === 0))
    return !isAddressOfOurOwnNetwork(readIpv4FromGroups(seventh, eighth));
  if (first === 0x64 && second === IPV6_NAT64_MARKER) {
    return !isAddressOfOurOwnNetwork(readIpv4FromGroups(seventh, eighth));
  }
  if (first === IPV6_6TO4_PREFIX) return !isAddressOfOurOwnNetwork(readIpv4FromGroups(second, third));
  const isGlobalUnicast = (first & IPV6_GLOBAL_MASK) === IPV6_GLOBAL_PREFIX;
  const isTeredoOrDocumentation = first === IPV6_TEREDO_PREFIX && (second === 0 || second === 0xd_b8);
  return isGlobalUnicast && !isTeredoOrDocumentation;
};

/** True only for a literal IPv4 or IPv6 address that belongs to the public internet. */
export const isPublicIpAddress = (address: string): boolean => {
  const host = address.replaceAll(/^\[|]$/g, '');
  switch (isIP(host)) {
    case 4: {
      const parts = readIpv4Parts(host);
      return parts !== null && !isAddressOfOurOwnNetwork(parts);
    }
    case 6: {
      const groups = readIpv6Groups(host.toLowerCase());
      return groups !== null && isPublicIpv6(groups);
    }
    default:
      return false;
  }
};

const withoutTrailingDot = (host: string): string => (host.endsWith('.') ? host.slice(0, -1) : host);

const isAllowedPort = (port: string): boolean => port === '' || port === LINK_PREVIEW_ALLOWED_PORT;

const isNameThatCouldBeRemote = (host: string): boolean => {
  if (LINK_PREVIEW_CLOSED_HOSTS.includes(host)) return false;
  if (LINK_PREVIEW_CLOSED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return false;
  return host.includes('.');
};

/**
 * Guards the server-side fetch against requests to loopback, private and cloud-metadata addresses.
 * It checks the address as written; a hostname that resolves to a private address is stopped
 * where the connection is made, which resolves the name and checks every result.
 */
export const isReachableLinkPreviewAddress = (address: string): boolean => {
  if (!URL.canParse(address)) return false;
  const url = new URL(address);
  if (url.protocol !== LINK_PREVIEW_ALLOWED_PROTOCOL) return false;
  if (!isAllowedPort(url.port)) return false;

  const host = withoutTrailingDot(url.hostname.toLowerCase().replaceAll(/^\[|]$/g, ''));
  if (isIP(host) !== 0) return isPublicIpAddress(host);
  return isNameThatCouldBeRemote(host);
};
