import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';

export const PagesCollectionBoardMissingGrouping = async () => {
  const t = await getTranslations('pages');
  return (
    <output
      className="block border border-warning/30 bg-warning/10"
      data-testid="collection-board-missing-grouping-property"
    >
      <EmptyState message={t('collection.missingGroupingProperty')} />
    </output>
  );
};
