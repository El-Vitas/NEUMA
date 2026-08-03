import { getLocale } from 'next-intl/server';
import { searchQuerySchema } from '@/modules/search/schemas/search.schemas';
import { getSearchResults } from '@/modules/search/server/queries/search.queries';
import { SearchView } from '@/modules/search/views/search.view';

interface IProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: IProps) {
  const params = searchQuerySchema.parse(await searchParams);
  const result = await getSearchResults(params);
  return <SearchView locale={await getLocale()} page={result.isOk() ? result.getValue() : null} params={params} />;
}
