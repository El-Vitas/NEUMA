import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { buildSearchPageUrl } from '@/shared/lib/search.lib';
import type { SearchPage, SearchQuery } from '@/shared/types/search.types';
import { SearchResultCard } from './search.result';
import { SearchRetry } from './search.retry';

interface IProps {
  readonly locale: string;
  readonly page: SearchPage | null;
  readonly params: SearchQuery;
}

export const SearchResults = ({ locale, page, params }: IProps) => {
  const t = useTranslations('portal.search');

  if (page === null) return <SearchRetry />;
  if (page.items.length === 0) {
    return (
      <section className="space-y-4">
        <output aria-atomic="true" className="block text-muted-foreground text-sm">
          {t('resultCount', { count: page.items.length })}
        </output>
        <EmptyState
          action={<p className="text-muted-foreground text-sm">{t('emptyDescription')}</p>}
          className="border border-border"
          message={t('emptyTitle')}
        />
      </section>
    );
  }

  const nextParams = page.nextCursor === undefined ? undefined : { ...params, cursor: page.nextCursor };
  return (
    <section className="space-y-4">
      <output aria-atomic="true" className="block text-muted-foreground text-sm">
        {t('resultCount', { count: page.items.length })}
      </output>
      <div className="space-y-3">
        {page.items.map((result) => (
          <SearchResultCard key={`${result.sourceType}-${result.sourceId}`} locale={locale} result={result} />
        ))}
      </div>
      {nextParams !== undefined && (
        <Link
          className="inline-flex min-h-11 items-center border border-border px-4 py-2 font-medium text-sm hover:bg-muted"
          href={buildSearchPageUrl(nextParams)}
        >
          {t('nextPage')}
        </Link>
      )}
    </section>
  );
};
