'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { PAGE_VERSION_API_ROUTES } from '../../constants/pages.history.constants';
import {
  pageVersionDocumentSchema,
  pageVersionInputSchema,
  pageVersionListInputSchema,
  pageVersionListingSchema,
} from '../../schemas/pages.history.schemas';
import type { PageVersionDocument, PageVersionListing } from '../../types/pages.history.types';

/** Read when the panel opens and as it scrolls: history is not part of the page payload and must never be stale. */
export const listPageVersionsAction = actionClient
  .inputSchema(pageVersionListInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'listPageVersions' }, async (): Promise<PageVersionListing> => {
      const accessToken = await requireAccessTokenCookie();
      const response = await apiRequest<unknown>(
        PAGE_VERSION_API_ROUTES.list(parsedInput.spaceId, parsedInput.pageId, parsedInput.cursor),
        accessToken,
      );
      return pageVersionListingSchema.parse(response);
    }),
  );

export const readPageVersionAction = actionClient.inputSchema(pageVersionInputSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'readPageVersion' }, async (): Promise<PageVersionDocument> => {
    const accessToken = await requireAccessTokenCookie();
    const response = await apiRequest<unknown>(
      PAGE_VERSION_API_ROUTES.read(parsedInput.spaceId, parsedInput.pageId, parsedInput.version),
      accessToken,
    );
    return pageVersionDocumentSchema.parse(response);
  }),
);

export const restorePageVersionAction = actionClient
  .inputSchema(pageVersionInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'restorePageVersion' }, async (): Promise<void> => {
      await authenticatedRequest(
        PAGE_VERSION_API_ROUTES.restore(parsedInput.spaceId, parsedInput.pageId, parsedInput.version),
        'POST',
        {},
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    }),
  );
