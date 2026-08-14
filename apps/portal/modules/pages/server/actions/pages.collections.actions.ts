'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { ApiError } from '@/shared/lib/api';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { PAGE_API_ROUTES, PAGES_CACHE_TAG } from '../../constants/pages.constants';
import { pageCollectionCreateSchema, pageCollectionReadSchema } from '../../schemas/pages.collections.schemas';
import { pageSchemaSchema } from '../../schemas/pages.schema.schemas';
import { pageSummarySchema } from '../../schemas/pages.schemas';
import type { PageSchema } from '../../types/pages.schema.types';
import type { PageSummary } from '../../types/pages.types';

const authenticatedRequest = async <T>(endpoint: string, method: string, body: unknown): Promise<T> => {
  const accessToken = await requireAccessTokenCookie();
  return apiRequest<T>(endpoint, accessToken, {
    body: JSON.stringify(body),
    headers: { 'x-mutation-id': crypto.randomUUID() },
    method,
  });
};

/**
 * Starts a collection: a page of its own, and the shape of what it keeps.
 *
 * Both in one go, because a page that was meant to be a collection and has no
 * shape yet is a page nobody can tell apart from an ordinary one, and it would
 * be left behind on the first failure.
 */
export const createPageCollectionAction = actionClient
  .inputSchema(pageCollectionCreateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'createPageCollection' }, async (): Promise<PageSummary> => {
      const created = await authenticatedRequest(PAGE_API_ROUTES.list(parsedInput.spaceId), 'POST', {
        content: parsedInput.content,
        parentId: parsedInput.parentId,
        title: parsedInput.title,
      });
      const page = pageSummarySchema.parse(created);
      await authenticatedRequest(PAGE_API_ROUTES.schema(parsedInput.spaceId, page.id), 'POST', {
        properties: parsedInput.properties,
        views: parsedInput.views,
      });
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return page;
    }),
  );

/** What a page keeps, or nothing at all when that page is not a collection. */
export const readPageCollectionAction = actionClient
  .inputSchema(pageCollectionReadSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'readPageCollection' }, async (): Promise<PageSchema | null> => {
      const accessToken = await requireAccessTokenCookie();
      try {
        const response = await apiRequest<unknown>(
          PAGE_API_ROUTES.schema(parsedInput.spaceId, parsedInput.pageId),
          accessToken,
        );
        return pageSchemaSchema.parse(response);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    }),
  );
