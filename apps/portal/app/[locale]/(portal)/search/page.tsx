import { getLocale } from 'next-intl/server';
import { SearchView } from '@/modules/search/views/search.view';
import { getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { searchQuerySchema } from '@/shared/schemas/search.schemas';
import { getSearchResults } from '@/shared/server/queries/search.queries';

interface IProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: IProps) {
  const params = searchQuerySchema.parse(await searchParams);
  const [result, spacesResult, locale] = await Promise.all([getSearchResults(params), getSpaces(), getLocale()]);
  return (
    <SearchView
      locale={locale}
      page={result.isOk() ? result.getValue() : null}
      params={params}
      spaces={spacesResult.isOk() ? spacesResult.getValue().map(({ id, name }) => ({ id, name })) : []}
    />
  );
}
