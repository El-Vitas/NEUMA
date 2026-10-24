'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { PAGE_TEMPLATE_API_ROUTES } from '../../constants/pages.templates.constants';
import {
  pageTemplateCreateSchema,
  pageTemplateDefaultSchema,
  pageTemplateDeleteSchema,
  pageTemplateListingSchema,
  pageTemplateReadSchema,
  pageTemplateSchema,
  pageTemplateUpdateSchema,
} from '../../schemas/pages.templates.schemas';
import type { PageTemplate, PageTemplateListing } from '../../types/pages.templates.types';

/** A read the editor asks for from the browser, as the picker of a button needs it: it changes nothing. */
export const listPageTemplatesAction = actionClient
  .inputSchema(pageTemplateReadSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'listPageTemplates' }, async (): Promise<PageTemplateListing> => {
      const listing = await apiRequest<unknown>(
        PAGE_TEMPLATE_API_ROUTES.list(parsedInput.spaceId, parsedInput.collectionId),
        await requireAccessTokenCookie(),
      );
      return pageTemplateListingSchema.parse(listing);
    }),
  );

/** The content and the values are edited on the page of the template, which opens as any page does. */
export const createPageTemplateAction = actionClient
  .inputSchema(pageTemplateCreateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'createPageTemplate' }, async (): Promise<PageTemplate> => {
      const created = await authenticatedRequest(
        PAGE_TEMPLATE_API_ROUTES.list(parsedInput.spaceId, parsedInput.collectionId),
        'POST',
        { isDefault: parsedInput.isDefault, title: parsedInput.title },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageTemplateSchema.parse(created);
    }),
  );

export const updatePageTemplateAction = actionClient
  .inputSchema(pageTemplateUpdateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'updatePageTemplate' }, async (): Promise<PageTemplate> => {
      const updated = await authenticatedRequest(
        PAGE_TEMPLATE_API_ROUTES.item(parsedInput.spaceId, parsedInput.collectionId, parsedInput.templateId),
        'PATCH',
        { title: parsedInput.title, variables: parsedInput.variables },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageTemplateSchema.parse(updated);
    }),
  );

export const deletePageTemplateAction = actionClient
  .inputSchema(pageTemplateDeleteSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'deletePageTemplate' }, async (): Promise<{ readonly deleted: true }> => {
      await authenticatedRequest(
        PAGE_TEMPLATE_API_ROUTES.item(parsedInput.spaceId, parsedInput.collectionId, parsedInput.templateId),
        'DELETE',
        {},
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return { deleted: true };
    }),
  );

/** One default at a time: choosing another one replaces it, and null takes it away. */
export const setDefaultPageTemplateAction = actionClient
  .inputSchema(pageTemplateDefaultSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'setDefaultPageTemplate' }, async (): Promise<PageTemplateListing> => {
      const listing = await authenticatedRequest(
        PAGE_TEMPLATE_API_ROUTES.setDefault(parsedInput.spaceId, parsedInput.collectionId),
        'PUT',
        { templateId: parsedInput.templateId },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageTemplateListingSchema.parse(listing);
    }),
  );
