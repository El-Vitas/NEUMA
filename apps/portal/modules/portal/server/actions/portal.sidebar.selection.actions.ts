'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { PORTAL_PAGE_BATCH_API_ROUTES } from '../../constants/portal.sidebar.selection.constants';
import {
  portalPageBatchMoveSchema,
  portalPageBatchOutcomeSchema,
  portalPageBatchTrashSchema,
} from '../../schemas/portal.sidebar.selection.schemas';

const requestBatchMutation = async <T>(endpoint: string, method: string, body: unknown): Promise<T> => {
  const accessToken = await requireAccessTokenCookie();
  return apiRequest<T>(endpoint, accessToken, {
    body: JSON.stringify(body),
    headers: { 'x-mutation-id': crypto.randomUUID() },
    method,
  });
};

/** Every selected page went to the trash together, cascading down whatever any of them carried with it. */
export const batchTrashPagesAction = actionClient.inputSchema(portalPageBatchTrashSchema).action(({ parsedInput }) =>
  withAction({ action: 'batchTrashPages' }, async () => {
    const outcome = await requestBatchMutation(PORTAL_PAGE_BATCH_API_ROUTES.trash, 'POST', {
      pageIds: parsedInput.pageIds,
    });
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    return portalPageBatchOutcomeSchema.parse(outcome);
  }),
);

/** Every selected page moved to the same destination, keeping whatever already hung from them. */
export const batchMovePagesAction = actionClient.inputSchema(portalPageBatchMoveSchema).action(({ parsedInput }) =>
  withAction({ action: 'batchMovePages' }, async () => {
    const outcome = await requestBatchMutation(PORTAL_PAGE_BATCH_API_ROUTES.move, 'PATCH', {
      pageIds: parsedInput.pageIds,
      parentId: parsedInput.parentId,
      targetSpaceId: parsedInput.targetSpaceId,
    });
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    if (parsedInput.targetSpaceId !== undefined) updateTag(PAGES_CACHE_TAG(parsedInput.targetSpaceId));
    return portalPageBatchOutcomeSchema.parse(outcome);
  }),
);
