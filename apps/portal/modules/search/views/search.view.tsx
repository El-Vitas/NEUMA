import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/shared/components/ui/page-header';
import { SearchForm } from '../components/search.form';
import { SearchResults } from '../components/search.results';
import type { SearchPage, SearchQuery } from '../types/search.types';

interface IProps {
  readonly locale: string;
  readonly page: SearchPage | null;
  readonly params: SearchQuery;
}

export const SearchView = async ({ locale, page, params }: IProps) => {
  const t = await getTranslations('portal.search');
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader subtitle={t('subtitle')} title={t('title')} />
      <SearchForm initialValues={params} />
      <SearchResults locale={locale} page={page} params={params} />
    </main>
  );
};
