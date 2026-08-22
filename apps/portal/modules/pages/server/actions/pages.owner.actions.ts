'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { PAGE_API_ROUTES } from '../../constants/pages.constants';
import { pageOwnerSchema, pageSummarySchema } from '../../schemas/pages.schemas';

/** Hands a page to somebody who answers for it, or takes that answer away. */
export const setPageOwnerAction = actionClient.inputSchema(pageOwnerSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'setPageOwner' }, async () => {
    const page = await authenticatedRequest(PAGE_API_ROUTES.owner(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
      ownerId: parsedInput.ownerId,
    });
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    return pageSummarySchema.parse(page);
  }),
);
