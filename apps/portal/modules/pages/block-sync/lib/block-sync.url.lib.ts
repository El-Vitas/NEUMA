import { BLOCK_SYNC_COLLABORATION_PATH_SUFFIX, BLOCK_SYNC_LIVE_PATH } from '../constants/block-sync.constants';

/** The address of the block socket, from the collaboration address the portal was built with (ADR 014). */
export const buildBlockLiveUrl = (collaborationUrl: string): string => {
  const address = new URL(collaborationUrl);
  address.pathname = `${address.pathname.replace(BLOCK_SYNC_COLLABORATION_PATH_SUFFIX, '')}${BLOCK_SYNC_LIVE_PATH}`;
  return address.toString();
};
