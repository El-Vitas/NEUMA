'use server';

import 'server-only';

import { z } from 'zod';
import { actionClient } from '@/lib/safe-action';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { BLOCK_SYNC_API_ROUTES } from '../../constants/block-sync.constants';
import { blockLiveTokenResponseSchema } from '../../schemas/block-sync.schemas';

export const getBlockLiveToken = actionClient.inputSchema(z.object({})).action(async () =>
  withAction({ action: 'getBlockLiveToken' }, async () => {
    const response = await apiServer.post(BLOCK_SYNC_API_ROUTES.liveToken, {});
    return blockLiveTokenResponseSchema.parse(response);
  }),
);
