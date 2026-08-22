'use server';

import 'server-only';

import { PAGE_LIFECYCLE } from '@company-brain/shared';
import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { PAGE_API_ROUTES } from '../../constants/pages.constants';
import type { PageDestination } from '../../editor/menus/types/pages.editor.destination.types';
import type { PageMoveDestinations } from '../../navigation/types/pages.move.types';
import {
  pageBlocksHandoverSchema,
  pageDestinationsSchema,
  pageDuplicateSchema,
  pageLocatorSchema,
  pageLockSchema,
  pageMoveDestinationsSchema,
  pageMoveSchema,
  pageMutationSchema,
  pageRenameSchema,
  pageReorderSchema,
  pageRestoreMutationSchema,
  pageSummarySchema,
  pagesListSchema,
} from '../../schemas/pages.schemas';
import { PAGE_TRASH_CACHE_TAG } from '../../trash/constants/pages.trash.constants';
import { trashRestoreOutcomeSchema } from '../../trash/schemas/pages.trash.schemas';
import type { TrashRestoreOutcome } from '../../trash/types/pages.trash.types';

export const createPageAction = actionClient
  .inputSchema(pageMutationSchema.extend({ parentId: pageMoveSchema.shape.parentId.optional() }))
  .action(async ({ parsedInput }) =>
    withAction({ action: 'createPage' }, async () => {
      const createdPage = await authenticatedRequest(PAGE_API_ROUTES.list(parsedInput.spaceId), 'POST', {
        content: parsedInput.content,
        parentId: parsedInput.parentId,
        propertyValues: parsedInput.propertyValues,
        title: parsedInput.title,
      });
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSummarySchema.parse(createdPage);
    }),
  );

export const updatePageAction = actionClient
  .inputSchema(pageMutationSchema.extend({ pageId: pageMoveSchema.shape.pageId }))
  .action(async ({ parsedInput }) =>
    withAction({ action: 'updatePage' }, async () => {
      await authenticatedRequest(PAGE_API_ROUTES.item(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
        content: parsedInput.content,
        propertyValues: parsedInput.propertyValues,
        title: parsedInput.title,
      });
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    }),
  );

/** A page's name changed from wherever it is listed, without opening it. */
export const renamePageAction = actionClient.inputSchema(pageRenameSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'renamePage' }, async () => {
    await authenticatedRequest(PAGE_API_ROUTES.title(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
      title: parsedInput.title,
    });
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
  }),
);

/** A page copied whole, with its branch when asked. The copy's own name is decided by whoever asks, in their language. */
export const duplicatePageAction = actionClient.inputSchema(pageDuplicateSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'duplicatePage' }, async () => {
    const copy = await authenticatedRequest(
      PAGE_API_ROUTES.duplicate(parsedInput.spaceId, parsedInput.pageId),
      'POST',
      { includeChildren: parsedInput.includeChildren ?? false, title: parsedInput.title },
    );
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    return pageSummarySchema.parse(copy);
  }),
);

/** A page closed to edits, or opened again. Whoever may write in it may also decide it should rest. */
export const setPageLockAction = actionClient.inputSchema(pageLockSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'setPageLock' }, async () => {
    const page = await authenticatedRequest(PAGE_API_ROUTES.lock(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
      locked: parsedInput.locked,
    });
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    return pageSummarySchema.parse(page);
  }),
);

/** Setting a page down among its own sisters, which changes the order and nothing else. */
export const reorderPageAction = actionClient.inputSchema(pageReorderSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'reorderPage' }, async () => {
    await authenticatedRequest(PAGE_API_ROUTES.order(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
      beforePageId: parsedInput.beforePageId,
    });
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
  }),
);

export const movePageAction = actionClient.inputSchema(pageMoveSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'movePage' }, async () => {
    await authenticatedRequest(PAGE_API_ROUTES.move(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
      parentId: parsedInput.parentId,
      targetSpaceId: parsedInput.targetSpaceId,
    });
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    /** A page that changed space leaves one tree and joins another, so both have to be read again. */
    if (parsedInput.targetSpaceId !== undefined) updateTag(PAGES_CACHE_TAG(parsedInput.targetSpaceId));
  }),
);

/**
 * Everywhere this page could go: the spaces its reader reaches and the pages of
 * those spaces, minus its own branch. Asked of the server rather than worked out
 * from the space at hand, since the space at hand is only one of the answers.
 */
export const listPageMoveDestinationsAction = actionClient
  .inputSchema(pageLocatorSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'listMoveDestinations' }, async (): Promise<PageMoveDestinations> => {
      const accessToken = await requireAccessTokenCookie();
      const response = await apiRequest<unknown>(PAGE_API_ROUTES.moveDestinations(parsedInput.pageId), accessToken);
      return pageMoveDestinationsSchema.parse(response);
    }),
  );

/**
 * The pages of a space a block could be sent to, named so they can be picked.
 *
 * They are read from the space itself rather than from the search index, so
 * choosing a destination works the moment a page exists.
 */
export const listPageDestinationsAction = actionClient
  .inputSchema(pageDestinationsSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'listDestinations' }, async (): Promise<readonly PageDestination[]> => {
      const accessToken = await requireAccessTokenCookie();
      const response = await apiRequest<unknown>(PAGE_API_ROUTES.list(parsedInput.spaceId), accessToken);
      return pagesListSchema
        .parse(response)
        .filter((page) => page.lifecycle === PAGE_LIFECYCLE.ACTIVE && page.id !== parsedInput.exceptPageId)
        .map((page) => ({ id: page.id, label: page.title, spaceId: page.spaceId }));
    }),
  );

/**
 * Adds blocks at the end of another page.
 *
 * The page that receives them is read first and written back whole, so the
 * blocks join what is already there instead of replacing it.
 */
export const addBlocksToPageAction = actionClient
  .inputSchema(pageBlocksHandoverSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'addBlocks' }, async () => {
      const accessToken = await requireAccessTokenCookie();
      const endpoint = PAGE_API_ROUTES.item(parsedInput.spaceId, parsedInput.pageId);
      const destination = pageSummarySchema.parse(await apiRequest<unknown>(endpoint, accessToken));

      await authenticatedRequest(endpoint, 'PATCH', {
        content: { ...destination.content, content: [...destination.content.content, ...parsedInput.content.content] },
        propertyValues: destination.propertyValues,
        title: destination.title,
      });
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    }),
  );

export const trashPageAction = actionClient.inputSchema(pageLocatorSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'trashPage' }, async () => {
    await authenticatedRequest(PAGE_API_ROUTES.trash(parsedInput.spaceId, parsedInput.pageId), 'POST', {});
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    updateTag(PAGE_TRASH_CACHE_TAG);
  }),
);

export const restorePageAction = actionClient.inputSchema(pageRestoreMutationSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'restorePage' }, async (): Promise<TrashRestoreOutcome> => {
    const response = await authenticatedRequest(
      PAGE_API_ROUTES.restore(parsedInput.spaceId, parsedInput.pageId),
      'POST',
      { includeChildren: parsedInput.includeChildren ?? false },
    );
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    updateTag(PAGE_TRASH_CACHE_TAG);
    return trashRestoreOutcomeSchema.parse(response);
  }),
);
