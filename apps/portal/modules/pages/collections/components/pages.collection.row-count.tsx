'use client';

import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import type { PageViewAggregates } from '../types/pages.schema.types';
import { PagesCollectionRowCountValue } from './pages.collection.row-count.value';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
}

/** How many rows the view holds in all, which the database finishes counting after the rows are drawn. */
export const PagesCollectionRowCount = ({ aggregates }: IProps) => {
  const t = useTranslations('pages.collection');

  return (
    <span className="px-1 text-muted-foreground text-xs tabular-nums" data-testid="collection-row-count">
      <Suspense fallback={t('calculating')}>
        <PagesCollectionRowCountValue aggregates={aggregates} />
      </Suspense>
    </span>
  );
};
