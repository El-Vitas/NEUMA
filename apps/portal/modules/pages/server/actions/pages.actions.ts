'use server';

import 'server-only';

import { PAGE_LIFECYCLE } from '@neuma/shared';
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
  pageContentReplacementSchema,
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
} from '../../schemas/pages.schemas';
import { PAGE_TRASH_CACHE_TAG } from '../../trash/constants/pages.trash.constants';
import { trashRestoreOutcomeSchema } from '../../trash/schemas/pages.trash.schemas';
import type { TrashRestoreOutcome } from '../../trash/types/pages.trash.types';
import { readPagesThatCanBeRead } from '../lib/pages.reading.server';

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

/** Replaces content without a live session; the server still applies it to the live document. */
export const replacePageContentAction = actionClient
  .inputSchema(pageContentReplacementSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'replacePageContent' }, async () => {
      await authenticatedRequest(PAGE_API_ROUTES.content(parsedInput.spaceId, parsedInput.pageId), 'PUT', {
        content: parsedInput.content,
      });
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    }),
  );

export const renamePageAction = actionClient.inputSchema(pageRenameSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'renamePage' }, async () => {
    await authenticatedRequest(PAGE_API_ROUTES.title(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
      title: parsedInput.title,
    });
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
  }),
);

/** The caller supplies the copy's title so it can be localized. */
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

export const setPageLockAction = actionClient.inputSchema(pageLockSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'setPageLock' }, async () => {
    const page = await authenticatedRequest(PAGE_API_ROUTES.lock(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
      locked: parsedInput.locked,
    });
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    return pageSummarySchema.parse(page);
  }),
);

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
    // A moved page leaves one space tree and joins another, so both caches are stale.
    if (parsedInput.targetSpaceId !== undefined) updateTag(PAGES_CACHE_TAG(parsedInput.targetSpaceId));
  }),
);

/** Spans every space the reader reaches and excludes the page's own branch. */
export const listPageMoveDestinationsAction = actionClient
  .inputSchema(pageLocatorSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'listMoveDestinations' }, async (): Promise<PageMoveDestinations> => {
      const accessToken = await requireAccessTokenCookie();
      const response = await apiRequest<unknown>(PAGE_API_ROUTES.moveDestinations(parsedInput.pageId), accessToken);
      return pageMoveDestinationsSchema.parse(response);
    }),
  );

/** Reads the space directly instead of the search index, so a new page is a valid destination immediately. */
export const listPageDestinationsAction = actionClient
  .inputSchema(pageDestinationsSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'listDestinations' }, async (): Promise<readonly PageDestination[]> => {
      const accessToken = await requireAccessTokenCookie();
      const response = await apiRequest<unknown>(PAGE_API_ROUTES.list(parsedInput.spaceId), accessToken);
      return readPagesThatCanBeRead(response, 'listDestinations')
        .filter((page) => page.lifecycle === PAGE_LIFECYCLE.ACTIVE && page.id !== parsedInput.exceptPageId)
        .map((page) => ({ id: page.id, label: page.title, spaceId: page.spaceId }));
    }),
  );

/** Appended by the server inside the live document; read-modify-write here would lose concurrent edits. */
export const addBlocksToPageAction = actionClient
  .inputSchema(pageBlocksHandoverSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'addBlocks' }, async () => {
      await authenticatedRequest(PAGE_API_ROUTES.blocks(parsedInput.spaceId, parsedInput.pageId), 'POST', {
        blocks: parsedInput.content.content,
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
