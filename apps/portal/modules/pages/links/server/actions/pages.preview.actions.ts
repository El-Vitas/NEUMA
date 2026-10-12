'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { apiRequest } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { withQuery } from '@/shared/lib/with-query.lib';
import { getPageSchema } from '../../../collections/server/queries/pages.schema.queries';
import type { PageSchema } from '../../../collections/types/pages.schema.types';
import { PAGE_API_ROUTES } from '../../../constants/pages.constants';
import { pageLocatorSchema, pageSummarySchema } from '../../../schemas/pages.schemas';
import { readPagePreviewFragment, readPagePreviewProperties, readPagePreviewTitle } from '../../lib/pages.preview.lib';
import type { PagePreviewContent } from '../../types/pages.preview.types';

const readPagePreviewSchema = async (spaceId: string, parentId: string | null): Promise<PageSchema | null> => {
  if (parentId === null) return null;
  const result = await getPageSchema(spaceId, parentId);
  return result.isFail() ? null : result.getValue();
};

/**
 * Reads through the same access check as opening the page, so a preview never reveals more.
 * Refusals are thrown as a reason code, as in pages.mentions.actions.ts, never as the raw failure message.
 */
export const getPagePreviewAction = actionClient.inputSchema(pageLocatorSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'getPagePreview' }, async (): Promise<PagePreviewContent> => {
    const pageResult = await withQuery({ op: 'getPagePreview', params: parsedInput }, async (accessToken) => {
      const response = await apiRequest<unknown>(
        PAGE_API_ROUTES.item(parsedInput.spaceId, parsedInput.pageId),
        accessToken,
      );
      return pageSummarySchema.parse(response);
    });
    if (pageResult.isFail()) throw pageResult.getError();

    const page = pageResult.getValue();
    const schema = await readPagePreviewSchema(page.spaceId, page.parentId);

    return {
      fragment: readPagePreviewFragment(page.content),
      icon: page.icon ?? null,
      properties: readPagePreviewProperties(schema, page.propertyValues),
      title: readPagePreviewTitle(page.title),
    };
  }),
);
