'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { PAGE_API_ROUTES } from '../../../constants/pages.constants';
import { pageLocatorSchema } from '../../../schemas/pages.schemas';
import { PAGE_TRASH_API_ROUTES, PAGE_TRASH_CACHE_TAG } from '../../constants/pages.trash.constants';
import {
  trashDescendantsPreviewSchema,
  trashEmptySchema,
  trashedPagesListSchema,
  trashWindowInputSchema,
} from '../../schemas/pages.trash.schemas';
import type { TrashDescendantsPreview, TrashedPagesListing } from '../../types/pages.trash.types';

export const getPageTrashPreviewAction = actionClient.inputSchema(pageLocatorSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'getPageTrashPreview' }, async (): Promise<TrashDescendantsPreview> => {
    const accessToken = await requireAccessTokenCookie();
    const response = await apiRequest<unknown>(
      PAGE_TRASH_API_ROUTES.trashPreview(parsedInput.spaceId, parsedInput.pageId),
      accessToken,
    );
    return trashDescendantsPreviewSchema.parse(response);
  }),
);

export const getPageRestorePreviewAction = actionClient.inputSchema(pageLocatorSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'getPageRestorePreview' }, async (): Promise<TrashDescendantsPreview> => {
    const accessToken = await requireAccessTokenCookie();
    const response = await apiRequest<unknown>(
      PAGE_TRASH_API_ROUTES.restorePreview(parsedInput.spaceId, parsedInput.pageId),
      accessToken,
    );
    return trashDescendantsPreviewSchema.parse(response);
  }),
);

/** A later window of the trash, read fresh: the first one came with the page. */
export const readTrashedPagesWindowAction = actionClient
  .inputSchema(trashWindowInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'readTrashedPagesWindow', skip: parsedInput.skip }, async (): Promise<TrashedPagesListing> => {
      const accessToken = await requireAccessTokenCookie();
      const response = await apiRequest<unknown>(
        PAGE_TRASH_API_ROUTES.list(undefined, parsedInput.search, parsedInput.skip),
        accessToken,
      );
      return trashedPagesListSchema.parse(response);
    }),
  );

export const deletePageForeverAction = actionClient.inputSchema(pageLocatorSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'deletePageForever' }, async () => {
    await authenticatedRequest(PAGE_API_ROUTES.item(parsedInput.spaceId, parsedInput.pageId), 'DELETE', {});
    updateTag(PAGE_TRASH_CACHE_TAG);
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
  }),
);

export const emptyTrashAction = actionClient.inputSchema(trashEmptySchema).action(async ({ parsedInput }) =>
  withAction({ action: 'emptyTrash' }, async () => {
    await authenticatedRequest(PAGE_TRASH_API_ROUTES.empty(parsedInput.spaceId), 'DELETE', {});
    updateTag(PAGE_TRASH_CACHE_TAG);
    if (parsedInput.spaceId !== undefined) updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
  }),
);
