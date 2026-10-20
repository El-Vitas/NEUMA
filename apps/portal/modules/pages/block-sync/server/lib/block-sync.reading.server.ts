import 'server-only';

import type { Result } from '@neuma/shared';
import { cache } from 'react';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { BLOCK_SYNC_API_ROUTES } from '../../constants/block-sync.constants';
import { blockSyncResponseSchema } from '../../schemas/block-sync.schemas';
import type { SyncedBlock } from '../../types/block-sync.types';

/**
 * The page and everything under it, as the editor starts from. Never kept in a cache: a page being written must
 * open with what was written a moment ago, and the live channel only corrects what changed after this read.
 * Deduplicated per request only.
 */
export const getPageBlocks = async (pageId: string): Promise<Result<readonly SyncedBlock[], Error>> =>
  withQuery({ op: 'getPageBlocks', params: { pageId } }, (accessToken) => readPageBlocksFresh(accessToken, pageId));

const readPageBlocksFresh = cache(async (accessToken: string, pageId: string): Promise<readonly SyncedBlock[]> => {
  const response = await apiRequest<unknown>(BLOCK_SYNC_API_ROUTES.sync, accessToken, {
    body: JSON.stringify({ pageId }),
    method: 'POST',
  });
  return blockSyncResponseSchema.parse(response).blocks;
});
