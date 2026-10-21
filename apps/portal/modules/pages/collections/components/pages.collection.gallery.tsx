import type { PageCardSize } from '@neuma/shared';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { readCardSizeColumns } from '../lib/pages.card-cover.lib';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageViewAggregates,
  PageViewGroup,
} from '../types/pages.schema.types';
import { PagesCollectionCardOptions } from './pages.collection.card-options';
import { PagesCollectionGalleryCard } from './pages.collection.gallery.card';
import { PagesCollectionGalleryMoreRows } from './pages.collection.gallery.more-rows';
import { PagesCollectionGroupSection } from './pages.collection.group-section';

interface IProps {
  readonly activeViewName: string;
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly canEdit: boolean;
  readonly cardSize: PageCardSize;
  readonly groups: readonly PageViewGroup[];
  readonly isGrouped: boolean;
  /** Where the cards of an ungrouped gallery end; the groups carry their own. */
  readonly nextCursor: null | string;
  readonly pageId: string;
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly viewId: string;
}

export const PagesCollectionGallery = async ({
  activeViewName,
  aggregates,
  canEdit,
  cardSize,
  groups,
  isGrouped,
  nextCursor,
  pageId,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  schema,
  spaceId,
  viewId,
}: IProps) => {
  const t = await getTranslations('pages');
  if (groups.every((group) => group.rows.length === 0)) return <EmptyState message={t('collection.emptyTable')} />;

  return (
    <div className="space-y-4" data-testid="collection-gallery">
      {canEdit && (
        <div className="flex justify-end">
          <PagesCollectionCardOptions activeViewName={activeViewName} schema={schema} spaceId={spaceId} />
        </div>
      )}
      {groups.map((group) => {
        const firstCursor = isGrouped ? (group.nextCursor ?? null) : nextCursor;
        return (
          <PagesCollectionGroupSection
            aggregates={aggregates}
            group={group}
            isGrouped={isGrouped}
            key={group.key}
            unassignedLabel={t('collection.unassignedGroup')}
          >
            <div className={cn('grid gap-3', readCardSizeColumns(cardSize))}>
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
              {firstCursor !== null && (
                <PagesCollectionGalleryMoreRows
                  paging={{
                    drawnRowIds: group.rows.map((row) => row.id),
                    firstCursor,
                    ...(isGrouped ? { group: { key: group.key } } : {}),
                    pageId,
                    spaceId,
                    viewId,
                  }}
                  personOptions={personOptions}
                  properties={properties}
                  spaceId={spaceId}
                />
              )}
            </div>
          </PagesCollectionGroupSection>
        );
      })}
    </div>
  );
};
