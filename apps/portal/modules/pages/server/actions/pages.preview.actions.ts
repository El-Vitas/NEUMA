'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { apiRequest } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_API_ROUTES } from '../../constants/pages.constants';
import {
  readPagePreviewFragment,
  readPagePreviewIcon,
  readPagePreviewProperties,
  readPagePreviewTitle,
} from '../../lib/pages.preview.lib';
import { pageLocatorSchema, pageSummarySchema } from '../../schemas/pages.schemas';
import type { PagePreviewContent } from '../../types/pages.preview.types';
import type { PageSchema } from '../../types/pages.schema.types';
import { getPageSchema } from '../queries/pages.schema.queries';

const readPagePreviewSchema = async (spaceId: string, parentId: string | null): Promise<PageSchema | null> => {
  if (parentId === null) return null;
  const result = await getPageSchema(spaceId, parentId);
  return result.isFail() ? null : result.getValue();
};

/**
 * What a page says of itself, for whoever is only resting on its name.
 *
 * Fetched through the same door a reader is let in by — the one that already
 * refuses a page they may not open — so a preview never says more than
 * opening the page itself would. Whichever way that door refuses an answer,
 * it is thrown the same way pages.mentions.actions.ts throws its own: a
 * reason the client turns into its own words, never the words the failure
 * arrived with.
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
      icon: readPagePreviewIcon(page.title),
      properties: readPagePreviewProperties(schema, page.propertyValues),
      title: readPagePreviewTitle(page.title),
    };
  }),
);
