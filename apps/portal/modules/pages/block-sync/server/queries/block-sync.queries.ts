import 'server-only';

import type { Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { BLOCK_SYNC_API_ROUTES, BLOCK_SYNC_CACHE_TAG } from '../../constants/block-sync.constants';
import { blockSyncResponseSchema } from '../../schemas/block-sync.schemas';
import type { SyncedBlock } from '../../types/block-sync.types';

/** The page and everything under it, as the editor starts from. The live channel reads it again on connecting. */
export const getPageBlocks = async (pageId: string): Promise<Result<readonly SyncedBlock[], Error>> =>
  withQuery({ op: 'getPageBlocks', params: { pageId } }, (accessToken) => getPageBlocksCached(accessToken, pageId));

const getPageBlocksCached = async (accessToken: string, pageId: string): Promise<readonly SyncedBlock[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(BLOCK_SYNC_CACHE_TAG(pageId));

  const response = await apiRequest<unknown>(BLOCK_SYNC_API_ROUTES.sync, accessToken, {
    body: JSON.stringify({ pageId }),
    method: 'POST',
  });
  return blockSyncResponseSchema.parse(response).blocks;
};
