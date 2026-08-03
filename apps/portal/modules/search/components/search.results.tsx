import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import { buildSearchPageUrl } from '../lib/search.lib';
import type { SearchPage, SearchQuery } from '../types/search.types';
import { SearchResultCard } from './search.result';

interface IProps {
  readonly locale: string;
  readonly page: SearchPage | null;
  readonly params: SearchQuery;
}

export const SearchResults = ({ locale, page, params }: IProps) => {
  const t = useTranslations('portal.search');
  if (page === null) return <FormErrorBanner message={t('loadError')} />;
  if (page.items.length === 0) {
    return (
      <section aria-live="polite" className="border border-border border-dashed p-8 text-center">
        <h2 className="font-medium text-lg">{t('emptyTitle')}</h2>
        <p className="mt-2 text-muted-foreground text-sm">{t('emptyDescription')}</p>
      </section>
    );
  }

  const nextParams = page.nextCursor === undefined ? undefined : { ...params, cursor: page.nextCursor };
  return (
    <section aria-live="polite" className="space-y-4">
      <p className="text-muted-foreground text-sm">{t('resultCount', { count: page.items.length })}</p>
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
