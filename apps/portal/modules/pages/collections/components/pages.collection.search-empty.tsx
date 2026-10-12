'use client';

import { useTranslations } from 'next-intl';
import { usePagesRowSearch } from '../hooks/use.pages.row-search';

export const PagesCollectionSearchEmpty = () => {
  const t = useTranslations('pages.collection');
  const search = usePagesRowSearch();
  if (search === null || !search.searching || search.matchCount > 0) return null;

  return (
    <p className="px-1 py-6 text-center text-muted-foreground text-sm" data-testid="search-no-matches">
      {t('searchNoMatches', { query: search.query.trim() })}
    </p>
  );
};
