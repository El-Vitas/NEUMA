'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import {
  PAGE_SHARING_API_ROUTES,
  PAGE_SHARING_BLOCK_TABLE,
  PAGE_SHARING_SET_PERMISSION_COMMAND,
} from '../../constants/pages.sharing.constants';
import { SharingRefusedError } from '../../lib/pages.sharing.errors';
import {
  blockAccessRequestSchema,
  blockAccessSchema,
  blockPermissionsRequestSchema,
  blockTransactionsResponseSchema,
} from '../../schemas/pages.sharing.schemas';
import type { BlockAccess } from '../../types/pages.sharing.types';

/** Read on demand rather than cached: it is per person, and it must be what the server holds right now. */
export const getBlockAccessAction = actionClient.inputSchema(blockAccessRequestSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'getBlockAccess' }, async (): Promise<BlockAccess> => {
    const accessToken = await requireAccessTokenCookie();
    const response = await apiRequest<unknown>(PAGE_SHARING_API_ROUTES.access(parsedInput.blockId), accessToken);
    return blockAccessSchema.parse(response);
  }),
);

export const setBlockPermissionsAction = actionClient
  .inputSchema(blockPermissionsRequestSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'setBlockPermissions' }, async () => {
      const response = await authenticatedRequest<unknown>(PAGE_SHARING_API_ROUTES.transactions, 'POST', {
        transactions: [
          {
            id: crypto.randomUUID(),
            operations: [
              {
                args: { permissions: parsedInput.permissions },
                command: PAGE_SHARING_SET_PERMISSION_COMMAND,
                path: [],
                pointer: { id: parsedInput.blockId, table: PAGE_SHARING_BLOCK_TABLE },
              },
            ],
            spaceId: parsedInput.spaceId,
          },
        ],
      });
      const refusal = blockTransactionsResponseSchema.parse(response).transactions.at(0)?.error;
      if (refusal !== undefined) throw new SharingRefusedError(refusal.code);
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return { blockId: parsedInput.blockId };
    }),
  );
