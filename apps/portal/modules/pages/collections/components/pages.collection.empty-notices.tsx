import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';
import type { CollectionEmptiness } from '../types/pages.collection-emptiness.types';

interface IProps {
  readonly emptiness: CollectionEmptiness;
  /** The words the rows were searched by. */
  readonly search: string;
}

/** Says which of the things that narrow a view left it empty, so the person knows the one to undo. */
export const PagesCollectionEmptyNotices = async ({ emptiness, search }: IProps) => {
  const t = await getTranslations('pages');

  return (
    <>
      {emptiness.hidesEverything && <EmptyState message={t('collection.everythingFiltered')} />}
      {emptiness.matchesNothing && (
        <p className="px-1 py-6 text-center text-muted-foreground text-sm" data-testid="search-no-matches">
          {t('collection.searchNoMatches', { query: search })}
        </p>
      )}
      {emptiness.quickFilterMatchesNothing && (
        <p className="px-1 py-6 text-center text-muted-foreground text-sm" data-testid="quick-filter-no-matches">
          {t('collection.quickFilterNoMatches')}
        </p>
      )}
    </>
  );
};
