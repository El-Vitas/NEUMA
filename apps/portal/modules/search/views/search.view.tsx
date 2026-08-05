import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/shared/components/ui/page-header';
import type { SearchPage, SearchQuery } from '@/shared/types/search.types';
import { SearchForm } from '../components/search.form';
import { SearchResults } from '../components/search.results';

interface IProps {
  readonly locale: string;
  readonly page: SearchPage | null;
  readonly params: SearchQuery;
  readonly spaces: readonly { readonly id: string; readonly name: string }[];
}

export const SearchView = async ({ locale, page, params, spaces }: IProps) => {
  const t = await getTranslations('portal.search');
  return (
    <main className="mx-auto w-full max-w-5xl space-y-7 p-4 sm:p-8 lg:pt-12">
      <PageHeader subtitle={t('subtitle')} title={t('title')} />
      <SearchForm initialValues={params} spaces={spaces} />
      <SearchResults locale={locale} page={page} params={params} />
    </main>
  );
};
