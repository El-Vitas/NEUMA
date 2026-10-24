import 'server-only';

import { apiRequest } from '@/shared/lib/api-server';
import {
  PAGE_LOOKUP_CONTENT_MAX_IDS,
  PAGE_LOOKUP_MAX_IDS,
  PAGE_TREE_API_ROUTES,
} from '../../constants/pages.tree.constants';
import { pageLookupContentSchema, pageLookupSchema } from '../../schemas/pages.tree.schemas';
import type { PageLookupContent, PageLookupEntry } from '../../types/pages.tree.types';

const splitIntoBatches = <Item>(items: readonly Item[], batchSize: number): Item[][] =>
  Array.from({ length: Math.ceil(items.length / batchSize) }, (_, index) =>
    items.slice(index * batchSize, (index + 1) * batchSize),
  );

const postIds = (accessToken: string, route: string, ids: readonly string[]): Promise<unknown> =>
  apiRequest<unknown>(route, accessToken, { body: JSON.stringify({ ids }), method: 'POST' });

/** Title, icon and place of many pages, in as few requests as the backend allows. A closed page is absent. */
export const readPageLookups = async (
  accessToken: string,
  ids: readonly string[],
): Promise<readonly PageLookupEntry[]> => {
  const batches = splitIntoBatches([...new Set(ids)], PAGE_LOOKUP_MAX_IDS);
  const answers = await Promise.all(
    batches.map(
      async (batch) => pageLookupSchema.parse(await postIds(accessToken, PAGE_TREE_API_ROUTES.lookup, batch)).pages,
    ),
  );
  return answers.flat();
};

/** The documents of pages another page borrows blocks from. */
export const readPageContents = async (
  accessToken: string,
  ids: readonly string[],
): Promise<readonly PageLookupContent[]> => {
  const batches = splitIntoBatches([...new Set(ids)], PAGE_LOOKUP_CONTENT_MAX_IDS);
  const answers = await Promise.all(
    batches.map(
      async (batch) =>
        pageLookupContentSchema.parse(await postIds(accessToken, PAGE_TREE_API_ROUTES.lookupContent, batch)).pages,
    ),
  );
  return answers.flat();
};
