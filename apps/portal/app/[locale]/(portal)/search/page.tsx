import { getLocale } from 'next-intl/server';
import { toSearchExtraFilterParams } from '@/modules/search/lib/search.filters.lib';
import { searchExtraFiltersSchema } from '@/modules/search/schemas/search.filters.schemas';
import { SearchView } from '@/modules/search/views/search.view';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { searchQuerySchema } from '@/shared/schemas/search.schemas';
import { getSearchResults } from '@/shared/server/queries/search.queries';

interface IProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Los resultados dependen de lo que se buscó: se resuelven enteros antes de
 * responder, en vez de prometer una navegación instantánea que no existe.
 */
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
