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

/**
 * Changes what one row holds, without touching what its page says.
 *
 * This is what a card dragged across a board does. Only the property that moved
 * travels: sending the whole page back would overwrite whatever somebody else
 * wrote in it while the card was in the air.
 */
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

/**
 * Changes the shape of a collection that already exists.
 *
 * What the rows already hold does not travel and does not move: the values live
 * on each row, not on the shape, so renaming a column or giving an option
 * another color leaves every row where it was. A property removed from the
 * shape stops being shown, and what the rows stored under it stays written in
 * case somebody puts it back.
 */
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

/**
 * Cambia lo que una vista dice de sí misma: por qué agrupa, qué filtra, qué
 * calcula, cómo se la está mirando.
 *
 * Va aparte de cambiar la forma porque no la toca. Mandar la colección entera
 * para doblar una franja o mover un borde reescribe cada propiedad y cada vista,
 * que es mucho trabajo para un gesto y una ventana donde el cambio de otra
 * persona se pierde.
 */
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

/**
 * Renombra una columna del tablero, o la quita.
 *
 * Va por su propio camino y no por el que cambia la forma entera porque solo
 * aquí se dice de qué nombre viene: sin eso, el servidor no podría reescribir lo
 * que las filas guardaron y todas las que estaban en esa columna se quedarían
 * diciendo algo que la colección ya no reconoce.
 */
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
