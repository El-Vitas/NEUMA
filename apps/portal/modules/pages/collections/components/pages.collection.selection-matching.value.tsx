'use client';

import { useTranslations } from 'next-intl';
import { use } from 'react';
import { Button } from '@/shared/components/ui/button';
import { PAGE_VIEW_MATCHING_MAXIMUM_ROWS } from '../constants/pages.query.constants';
import { usePagesMatchingSelection } from '../hooks/use.pages.matching-selection';
import { usePagesRowSelection } from '../hooks/use.pages.row-selection';
import type { PageViewAggregates } from '../types/pages.schema.types';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly pageId: string;
  readonly spaceId: string;
  readonly viewId: string;
}

/** Offers every matching row when the marked ones are not all of them, or says that there are too many to mark. */
export const PagesCollectionSelectionMatchingValue = ({ aggregates, pageId, spaceId, viewId }: IProps) => {
  const t = useTranslations('pages.collection');
  const counted = use(aggregates);
  const selection = usePagesRowSelection();
  const matching = usePagesMatchingSelection(pageId, spaceId, viewId);
  const total = counted?.distinctRowCount ?? 0;
  if (selection === null || total <= selection.count) return null;

  if (total > PAGE_VIEW_MATCHING_MAXIMUM_ROWS) {
    return (
      <span className="px-1 text-muted-foreground text-xs" data-testid="selection-too-many">
        {t('bulkTooManyMatching', { count: total, maximum: PAGE_VIEW_MATCHING_MAXIMUM_ROWS })}
      </span>
    );
  }

  return (
    <Button
      className="min-h-11 rounded-md"
      disabled={matching.isReading}
      onClick={matching.selectAllMatching}
      size="sm"
      type="button"
      variant="ghost"
    >
      {t('bulkSelectAllMatching', { count: total })}
    </Button>
  );
};
