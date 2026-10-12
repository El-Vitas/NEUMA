import { getLocale } from 'next-intl/server';
import { toSearchExtraFilterParams } from '@/modules/search/lib/search.filters.lib';
import { searchExtraFiltersSchema } from '@/modules/search/schemas/search.filters.schemas';
import { SearchView } from '@/modules/search/views/search.view';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { searchQuerySchema } from '@/shared/schemas/search.schemas';
import { getSearchResults } from '@/shared/server/queries/search.queries';
import type { RouteSearchParams } from '@/shared/types/route-search-params.types';

interface IProps {
  readonly searchParams: Promise<RouteSearchParams>;
}

/** Depends on the search query, so it resolves fully before responding. */
export const instant = false;

export default async function Page({ searchParams }: IProps) {
  const resolvedSearchParams = await searchParams;
  const params = searchQuerySchema.parse(resolvedSearchParams);
  const filters = searchExtraFiltersSchema.parse(resolvedSearchParams);
  const [result, spacesResult, locale] = await Promise.all([
    getSearchResults(params, toSearchExtraFilterParams(filters)),
    getSpaces(),
    getLocale(),
  ]);
  return (
    <SearchView
      filters={filters}
      locale={locale}
      page={result.isOk() ? result.getValue() : null}
      params={params}
      spaces={spacesResult.isOk() ? spacesResult.getValue().map(({ id, name }) => ({ id, name })) : []}
    />
  );
}
