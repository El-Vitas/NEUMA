'use client';

import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import type { PageViewAggregates } from '../types/pages.schema.types';
import { PagesCollectionGroupCountValue } from './pages.collection.group-count.value';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly bandKey?: string | undefined;
  /** What to show if the count could not be worked out: the rows the server drew for the group. */
  readonly drawn: number;
  readonly groupKey?: string | undefined;
  /** The band of a board with bands. */
  readonly subKey?: string | undefined;
}

/** The rows the group holds in all, which the database finishes counting after the rows are drawn. */
export const PagesCollectionGroupCount = (props: IProps) => {
  const t = useTranslations('pages.collection');

  return (
    <Suspense
      fallback={
        <span aria-label={t('calculating')} role="status">
          …
        </span>
      }
    >
      <PagesCollectionGroupCountValue {...props} />
    </Suspense>
  );
};
