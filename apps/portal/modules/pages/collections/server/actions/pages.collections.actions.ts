'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { ApiError } from '@/shared/lib/api';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { PAGE_API_ROUTES } from '../../../constants/pages.constants';
import { pageSummarySchema } from '../../../schemas/pages.schemas';
import type { PageSummary } from '../../../types/pages.types';
import {
  pageCollectionCreateSchema,
  pageCollectionReadSchema,
  pageCollectionUpdateSchema,
  pageOptionRewriteSchema,
  pageRowPropertiesSchema,
  pageViewConfigurationUpdateSchema,
} from '../../schemas/pages.collections.schemas';
import { pageSchemaSchema } from '../../schemas/pages.schema.schemas';
import type { PageSchema } from '../../types/pages.schema.types';

/** Page and shape are created together: a page without a shape is indistinguishable from an ordinary one. */
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

/** Only the changed properties travel: sending the whole page would overwrite concurrent edits to its content. */
export const updatePageRowPropertiesAction = actionClient
  .inputSchema(pageRowPropertiesSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'updatePageRowProperties' }, async (): Promise<void> => {
      await authenticatedRequest(PAGE_API_ROUTES.properties(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
        propertyValues: parsedInput.propertyValues,
      });
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    }),
  );

/** Row values live on the rows, not the shape: a removed property stops showing but its stored values remain. */
export const updatePageCollectionAction = actionClient
  .inputSchema(pageCollectionUpdateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'updatePageCollection' }, async (): Promise<PageSchema> => {
      const updated = await authenticatedRequest(
        PAGE_API_ROUTES.schema(parsedInput.spaceId, parsedInput.pageId),
        'POST',
        { properties: parsedInput.properties, views: parsedInput.views },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSchemaSchema.parse(updated);
    }),
  );

/** Separate from the shape update: resending the whole collection for one view tweak risks losing others' changes. */
export const updatePageViewConfigurationAction = actionClient
  .inputSchema(pageViewConfigurationUpdateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'updatePageViewConfiguration' }, async (): Promise<PageSchema> => {
      const updated = await authenticatedRequest(
        PAGE_API_ROUTES.viewConfiguration(parsedInput.spaceId, parsedInput.pageId, parsedInput.viewName),
        'POST',
        { configuration: parsedInput.configuration },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSchemaSchema.parse(updated);
    }),
  );

/** Needs the old name so the server can rewrite the values rows already stored under it. */
export const rewritePageCollectionOptionAction = actionClient
  .inputSchema(pageOptionRewriteSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'rewritePageCollectionOption' }, async (): Promise<PageSchema> => {
      const updated = await authenticatedRequest(
        PAGE_API_ROUTES.rewriteOption(parsedInput.spaceId, parsedInput.pageId, parsedInput.propertyKey),
        'POST',
        { from: parsedInput.from, ...(parsedInput.to === null ? {} : { to: parsedInput.to }) },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSchemaSchema.parse(updated);
    }),
  );

/** Null when the page is not a collection (404). */
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
