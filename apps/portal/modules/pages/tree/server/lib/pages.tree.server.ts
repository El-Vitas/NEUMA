import 'server-only';

import { apiRequest } from '@/shared/lib/api-server';
import { PAGE_TREE_API_ROUTES } from '../../constants/pages.tree.constants';
import { pageTreeChildrenSchema } from '../../schemas/pages.tree.schemas';
import type { PageTreeChildren, PageTreeWindowRequest } from '../../types/pages.tree.types';

const buildWindowQuery = ({ parentId, skip, take }: PageTreeWindowRequest): string => {
  const query = new URLSearchParams({ skip: String(skip), take: String(take) });
  if (parentId !== null) query.set('parentId', parentId);
  return query.toString();
};

/** One window of the children of a parent, as the backend answers it for the reader behind the token. */
export const readTreeWindow = async (
  accessToken: string,
  spaceId: string,
  request: PageTreeWindowRequest,
): Promise<PageTreeChildren> =>
  pageTreeChildrenSchema.parse(
    await apiRequest<unknown>(PAGE_TREE_API_ROUTES.children(spaceId, buildWindowQuery(request)), accessToken),
  );
