'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { PAGE_API_ROUTES, PAGES_CACHE_TAG } from '../../constants/pages.constants';
import {
  pageLifecycleMutationSchema,
  pageMoveSchema,
  pageMutationSchema,
  pageSummarySchema,
} from '../../schemas/pages.schemas';

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
