import 'server-only';

import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { getSearchResults } from '@/shared/server/queries/search.queries';
import type { PageDestination } from '../../editor/menus/types/pages.editor.destination.types';
import { PAGE_DESTINATION_SEARCH_LIMIT, PAGE_TREE_WINDOW_SIZE } from '../../tree/constants/pages.tree.constants';
import { readTreeWindow } from '../../tree/server/lib/pages.tree.server';

const readTopOfSpace = async (spaceId: string): Promise<readonly PageDestination[]> => {
  const top = await readTreeWindow(await requireAccessTokenCookie(), spaceId, {
    parentId: null,
    skip: 0,
    take: PAGE_TREE_WINDOW_SIZE,
  });
  return top.entries.map((page) => ({ id: page.id, label: page.title, spaceId }));
};

const searchSpace = async (spaceId: string, query: string): Promise<readonly PageDestination[]> => {
  const result = await getSearchResults({
    limit: PAGE_DESTINATION_SEARCH_LIMIT,
    query,
    sourceType: 'PAGE',
    spaceId,
  });
  if (result.isFail()) throw result.getError();
  return result.getValue().items.map((item) => ({ id: item.sourceId, label: item.title, spaceId: item.spaceId }));
};

/** Where a block or a button can be sent: the top of the space, or what a search of the space finds. */
export const readPageDestinations = async (
  spaceId: string,
  query: string,
  exceptPageId: string | null,
): Promise<readonly PageDestination[]> => {
  const found = query === '' ? await readTopOfSpace(spaceId) : await searchSpace(spaceId, query);
  return found.filter((destination) => destination.id !== exceptPageId);
};
