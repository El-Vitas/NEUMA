import type { LinkPreviewResolveAddresses, LinkPreviewResolvedAddress } from '../types/pages.link-preview.types';
import { isPublicIpAddress } from './pages.link-preview.address.lib';

/**
 * Every address a name resolves to must be public, or the connection is refused. Running this as the
 * socket's own lookup means the address that is checked is the address that is connected to.
 */
export const resolvePublicAddresses = async (
  hostname: string,
  resolve: LinkPreviewResolveAddresses,
): Promise<readonly LinkPreviewResolvedAddress[]> => {
  const resolved = await resolve(hostname);
  if (resolved.length === 0) throw new Error(`The host ${hostname} resolved to no address`);
  const hidden = resolved.find((entry) => !isPublicIpAddress(entry.address));
  if (hidden !== undefined) throw new Error(`The host ${hostname} resolves to a non-public address`);
  return resolved;
};
