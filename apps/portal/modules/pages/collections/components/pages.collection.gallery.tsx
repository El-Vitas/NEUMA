'use client';

import { readPageViewConfiguration } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { usePagesViewLive } from '../hooks/use.pages.view-live';
import { readCardSizeColumns } from '../lib/pages.card-cover.lib';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewAggregates,
  PageViewBand,
} from '../types/pages.schema.types';
import { PagesCollectionCardOptions } from './pages.collection.card-options';
import { PagesCollectionGalleryCard } from './pages.collection.gallery.card';
import { PagesCollectionGroupSection } from './pages.collection.group-section';
import { PagesCollectionLoadMoreButton } from './pages.collection.load-more.button';

interface IProps {
  readonly activeViewName: string;
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** The cards as the server drew them: one band, with one unnamed group when the gallery does not group. */
  readonly bands: readonly PageViewBand[];
  readonly canEdit: boolean;
  /** Where to read what changed after those cards were read; null when the gallery cannot follow changes. */
  readonly changesCursor: null | string;
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly view: PageSchemaView;
  /** Who looks; null when the browser does not know, and a filter that names the reader then goes to the server. */
  readonly viewerId?: null | string;
}

export const PagesCollectionGallery = ({
  activeViewName,
  aggregates: drawnAggregates,
  bands,
  canEdit,
  changesCursor,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  schema,
  spaceId,
  view,
  viewerId = null,
}: IProps) => {
  const t = useTranslations('pages');
  const configuration = readPageViewConfiguration(view.configuration);
  const live = usePagesViewLive({
    aggregates: drawnAggregates,
    bands,
    changesCursor,
    groupByKey: configuration.groupBy ?? '',
    groupByMode: configuration.groupByMode,
    pageId: schema.pageId,
    properties: schema.properties,
    spaceId,
    subGroupByKey: '',
    view,
    viewerId,
  });
  const groups = live.bands[0]?.groups ?? [];
  if (groups.every((group) => group.rows.length === 0)) return <EmptyState message={t('collection.emptyTable')} />;
  const isGrouped = configuration.groupBy !== null;

  return (
    <div className="space-y-4" data-testid="collection-gallery">
      {canEdit && (
        <div className="flex justify-end">
          <PagesCollectionCardOptions activeViewName={activeViewName} schema={schema} spaceId={spaceId} />
        </div>
      )}
      {groups.map((group) => (
        <PagesCollectionGroupSection
          aggregates={live.aggregates}
          group={group}
          isGrouped={isGrouped}
          key={group.key}
          unassignedLabel={t('collection.unassignedGroup')}
        >
          <div className={cn('grid gap-3', readCardSizeColumns(configuration.cardSize))}>
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
            {group.nextCursor !== null && group.nextCursor !== undefined && (
              <div className="col-span-full">
                <PagesCollectionLoadMoreButton
                  isLoading={live.isLoading('', group.key)}
                  onLoad={() => live.loadMore('', group.key)}
                />
              </div>
            )}
          </div>
        </PagesCollectionGroupSection>
      ))}
    </div>
  );
};
