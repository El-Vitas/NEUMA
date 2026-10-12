import { getTrashedPages } from '@/modules/pages/trash/server/queries/pages.trash.queries';
import { PagesTrashView } from '@/modules/pages/trash/views/pages.trash.view';
import type { RouteSearchParams } from '@/shared/types/route-search-params.types';

interface IProps {
  readonly searchParams: Promise<RouteSearchParams>;
}

/** Depends on the session and the search query, so it resolves fully before responding. */
export const instant = false;

export default async function Page({ searchParams }: IProps) {
  const params = await searchParams;
  const rawSearch = params.search;
  const search = typeof rawSearch === 'string' ? rawSearch : '';
  const result = await getTrashedPages(search.length > 0 ? search : undefined);

  return <PagesTrashView items={result.isOk() ? result.getValue() : null} search={search} />;
}
