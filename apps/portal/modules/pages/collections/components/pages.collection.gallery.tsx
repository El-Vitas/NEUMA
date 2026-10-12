import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import type { PagePersonOption, PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionGalleryCard } from './pages.collection.gallery.card';
import { PagesCollectionGroupSection } from './pages.collection.group-section';

interface IProps {
  readonly groups: readonly PageViewGroup[];
  readonly isGrouped: boolean;
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

export const PagesCollectionGallery = async ({
  groups,
  isGrouped,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  spaceId,
}: IProps) => {
  const t = await getTranslations('pages');
  if (groups.every((group) => group.rows.length === 0)) return <EmptyState message={t('collection.emptyTable')} />;

  return (
    <div className="space-y-4" data-testid="collection-gallery">
      {groups.map((group) => (
        <PagesCollectionGroupSection
          group={group}
          isGrouped={isGrouped}
          key={group.key}
          unassignedLabel={t('collection.unassignedGroup')}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {group.rows.map((row) => (
              <PagesCollectionGalleryCard
                key={row.id}
                openFullPageLabel={t('sidePanel.openFullPage')}
                personOptions={personOptions}
                properties={properties}
                row={row}
                spaceId={spaceId}
                untitledLabel={t('untitled')}
              />
            ))}
          </div>
        </PagesCollectionGroupSection>
      ))}
    </div>
  );
};
