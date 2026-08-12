'use server';

import 'server-only';

import { PAGE_LIFECYCLE } from '@company-brain/shared';
import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { PAGE_API_ROUTES, PAGES_CACHE_TAG } from '../../constants/pages.constants';
import {
  pageBlocksHandoverSchema,
  pageDestinationsSchema,
  pageLifecycleMutationSchema,
  pageMoveSchema,
  pageMutationSchema,
  pageSummarySchema,
  pagesListSchema,
} from '../../schemas/pages.schemas';
import type { PageDestination } from '../../types/pages.editor.destination.types';

const authenticatedRequest = async <T>(endpoint: string, method: string, body: unknown): Promise<T> => {
  const accessToken = await requireAccessTokenCookie();
  return apiRequest<T>(endpoint, accessToken, {
    body: JSON.stringify(body),
    headers: { 'x-mutation-id': crypto.randomUUID() },
    method,
  });
};

export const createPageAction = actionClient
  .schema(pageMutationSchema.extend({ parentId: pageMoveSchema.shape.parentId.optional() }))
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
  .schema(pageMutationSchema.extend({ pageId: pageMoveSchema.shape.pageId }))
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

export const movePageAction = actionClient.schema(pageMoveSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'movePage' }, async () => {
    await authenticatedRequest(PAGE_API_ROUTES.move(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
      parentId: parsedInput.parentId,
    });
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
  }),
);

/**
 * The pages of a space a block could be sent to, named so they can be picked.
 *
 * They are read from the space itself rather than from the search index, so
 * choosing a destination works the moment a page exists.
 */
export const listPageDestinationsAction = actionClient.schema(pageDestinationsSchema).action(async ({ parsedInput }) =>
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
export const addBlocksToPageAction = actionClient.schema(pageBlocksHandoverSchema).action(async ({ parsedInput }) =>
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

export const trashPageAction = actionClient.schema(pageLifecycleMutationSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'trashPage' }, async () => {
    await authenticatedRequest(PAGE_API_ROUTES.trash(parsedInput.spaceId, parsedInput.pageId), 'POST', {});
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
  }),
);

export const restorePageAction = actionClient.schema(pageLifecycleMutationSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'restorePage' }, async () => {
    await authenticatedRequest(PAGE_API_ROUTES.restore(parsedInput.spaceId, parsedInput.pageId), 'POST', {});
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
  }),
);
