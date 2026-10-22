'use client';

import { readPageViewConfiguration } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { usePagesViewLive } from '../hooks/use.pages.view-live';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewAggregates,
  PageViewBand,
} from '../types/pages.schema.types';
import { PagesCollectionGroupSection } from './pages.collection.group-section';
import { PagesCollectionListGroupRows } from './pages.collection.list.group-rows';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** The rows as the server drew them: one band, with one unnamed group when the list does not group. */
  readonly bands: readonly PageViewBand[];
  /** Where to read what changed after those rows were read; null when the list cannot follow changes. */
  readonly changesCursor: null | string;
  readonly personOptions?: readonly PagePersonOption[];
  /** Already narrowed to what this view shows. */
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly view: PageSchemaView;
  /** Who looks; null when the browser does not know, and a filter that names the reader then goes to the server. */
  readonly viewerId?: null | string;
}

export const PagesCollectionList = ({
  aggregates: drawnAggregates,
  bands,
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
    <div className="space-y-4" data-testid="collection-list">
      {groups.map((group) => (
        <PagesCollectionGroupSection
          aggregates={live.aggregates}
          group={group}
          isGrouped={isGrouped}
          key={group.key}
          unassignedLabel={t('collection.unassignedGroup')}
        >
          <ul className="m-0 list-none p-0">
            <PagesCollectionListGroupRows
              group={group}
              isLoadingMore={live.isLoading('', group.key)}
              onLoadMore={() => live.loadMore('', group.key)}
              personOptions={personOptions}
              properties={properties}
              spaceId={spaceId}
            />
          </ul>
        </PagesCollectionGroupSection>
      ))}
    </div>
  );
};
