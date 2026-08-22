import { PAGE_VIEW_OUTCOME_KIND } from '@company-brain/shared';
import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';
import type { PageSchemaProperty, PageViewOutcome } from '../types/pages.schema.types';
import { PagesCollectionBoard } from './pages.collection.board';
import { PagesCollectionBoardMissingGrouping } from './pages.collection.board.missing-grouping';
import { PagesCollectionTable } from './pages.collection.table';

interface IProps {
  readonly outcome: PageViewOutcome | null;
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

export const PagesCollectionViewOutcome = async ({ outcome, properties, spaceId }: IProps) => {
  if (outcome === null) {
    const t = await getTranslations('pages');
    return <FormErrorBanner message={t('collection.loadError')} />;
  }
  if (outcome.kind === PAGE_VIEW_OUTCOME_KIND.TABLE_ROWS) {
    return PagesCollectionTable({ properties, rows: outcome.rows, spaceId });
  }
  if (outcome.kind === PAGE_VIEW_OUTCOME_KIND.BOARD_COLUMNS) {
    return PagesCollectionBoard({ columns: outcome.columns, spaceId });
  }
  return PagesCollectionBoardMissingGrouping();
};
