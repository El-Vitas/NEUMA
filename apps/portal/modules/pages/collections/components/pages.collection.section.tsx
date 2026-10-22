import type { PageFilter } from '@neuma/shared';
import { PAGE_VIEW_OUTCOME_KIND, PAGE_VIEW_TYPE, readPageViewConfiguration } from '@neuma/shared';
import { getTranslations } from 'next-intl/server';
import { readRequestTimeZone } from '@/shared/server/lib/time-zone.server';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { PagesTemplatesSection } from '../../templates/components/pages.templates.section';
import { NO_PAGE_AGGREGATES } from '../constants/pages.aggregates.constants';
import { EMPTY_PAGE_COLLECTION_LOOKUPS } from '../constants/pages.lookups.constants';
import { readCollectionEmptiness } from '../lib/pages.collection.emptiness.lib';
import { listComputedSourceCollectionIds } from '../lib/pages.computed-sources.lib';
import { isOutcomeEmpty } from '../lib/pages.view-editing.lib';
import { getSpaceCollections } from '../server/queries/pages.schema.queries';
import type { PageCollectionLookups } from '../types/pages.lookups.types';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewReading,
} from '../types/pages.schema.types';
import { PagesCollectionCacheSeeder } from './pages.collection.cache-seeder';
import { PagesCollectionCardAppearanceProvider } from './pages.collection.card-appearance.provider';
import { PagesCollectionComputedSourcesFollower } from './pages.collection.computed-sources-follower';
import { PagesCollectionEmptyNotices } from './pages.collection.empty-notices';
import { PagesCollectionFilterBar } from './pages.collection.filter-bar';
import { PagesCollectionLiveFollower } from './pages.collection.live-follower';
import { PagesCollectionLookupsProvider } from './pages.collection.lookups.provider';
import { PagesCollectionNoticesProvider } from './pages.collection.notices.provider';
import { PagesCollectionPendingWrites } from './pages.collection.pending-writes';
import { PagesCollectionQuickFilter } from './pages.collection.quick-filter';
import { PagesCollectionRowCount } from './pages.collection.row-count';
import { PagesCollectionRowQueryProvider } from './pages.collection.row-query.provider';
import { PagesCollectionSearchField } from './pages.collection.search-field';
import { PagesCollectionTabs } from './pages.collection.tabs';
import { PagesCollectionTimeZone } from './pages.collection.time-zone';
import { PagesCollectionView } from './pages.collection.view';
import { PagesCollectionWritesProvider } from './pages.collection.writes.provider';
import { PagesSchemaSettingsButton } from './pages.schema.settings-button';

interface IProps {
  readonly activeView: PageSchemaView;
  readonly canEdit: boolean;
  readonly personOptions?: readonly PagePersonOption[];
  readonly reading: PageViewReading | null;
  readonly properties: readonly PageSchemaProperty[];
  /** The filter on top of the view the rows were read with; null when there is none. */
  readonly quickFilter?: null | PageFilter;
  readonly schema: PageSchema;
  /** The words the rows were read with; empty when the view is not being searched. */
  readonly search?: string;
  readonly spaceId: string;
  readonly views: readonly PageSchemaView[];
  /** Who looks, so the browser can tell what "me" means in a filter without asking the server. */
  readonly viewerId?: null | string;
}

export const PagesCollectionSection = async ({
  activeView,
  canEdit,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  quickFilter = null,
  reading,
  schema,
  search = '',
  spaceId,
  viewerId = null,
  views,
}: IProps) => {
  const t = await getTranslations('pages');
  const knownTimeZone = await readRequestTimeZone();
  const collectionsResult = canEdit ? await getSpaceCollections(spaceId) : null;
  const collections = collectionsResult?.isOk() === true ? collectionsResult.getValue() : [];
  const aggregates = reading === null ? NO_PAGE_AGGREGATES : reading.aggregates;
  const configuration = readPageViewConfiguration(activeView.configuration);
  const { hidesEverything, matchesNothing, quickFilterMatchesNothing } = readCollectionEmptiness({
    hasViewFilter: configuration.filter !== null,
    isCalendar: activeView.type === PAGE_VIEW_TYPE.CALENDAR || activeView.type === PAGE_VIEW_TYPE.TIMELINE,
    isOutcomeEmpty: reading !== null && isOutcomeEmpty(reading.outcome),
    quickFilter,
    search,
  });
  const lookups: PageCollectionLookups =
    reading === null
      ? { ...EMPTY_PAGE_COLLECTION_LOOKUPS, people: personOptions }
      : { attachedFiles: reading.attachedFiles, people: personOptions, relatedRows: reading.relatedRows };

  return (
    <PagesCollectionLookupsProvider lookups={lookups}>
      <PagesCollectionRowQueryProvider quickFilter={quickFilter} search={search}>
        <PagesCollectionCardAppearanceProvider
          coverProperty={configuration.coverProperty}
          size={configuration.cardSize}
        >
          <PagesCollectionTimeZone knownTimeZone={knownTimeZone} />
          <PagesCollectionNoticesProvider spaceId={spaceId}>
            <PagesCollectionLiveFollower collectionId={schema.pageId} />
            {reading !== null &&
              reading.changesCursor !== null &&
              reading.outcome.kind !== PAGE_VIEW_OUTCOME_KIND.MISSING_GROUPING_PROPERTY && (
                <PagesCollectionCacheSeeder
                  aggregates={aggregates}
                  changesCursor={reading.changesCursor}
                  lookups={lookups}
                  outcome={reading.outcome}
                  pageId={schema.pageId}
                  personOptions={personOptions}
                  schema={schema}
                  view={activeView}
                  viewerId={viewerId}
                />
              )}
            <PagesCollectionComputedSourcesFollower
              collectionIds={listComputedSourceCollectionIds(schema.properties)}
            />
            <PagesCollectionWritesProvider collectionId={schema.pageId}>
              <section aria-label={t('collection.sectionTitle')} className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2 border-border border-b">
                  <PagesCollectionTabs
                    activeViewName={activeView.name}
                    label={t('collection.viewsLabel')}
                    quickFilter={quickFilter}
                    search={search}
                    views={views}
                  />
                  <div className="flex items-center gap-1 pb-1">
                    {reading !== null && <PagesCollectionRowCount aggregates={aggregates} />}
                    {activeView.type !== PAGE_VIEW_TYPE.CHART && (
                      <PagesCollectionSearchField
                        activeViewName={activeView.name}
                        quickFilter={quickFilter}
                        search={search}
                      />
                    )}
                    <PagesCollectionQuickFilter
                      activeViewName={activeView.name}
                      quickFilter={quickFilter}
                      schema={schema}
                      search={search}
                    />
                    {canEdit && (
                      <>
                        {
                          await PagesTemplatesSection({
                            collectionId: schema.pageId,
                            properties: schema.properties,
                            spaceId,
                          })
                        }
                        <PagesCollectionFilterBar activeViewName={activeView.name} schema={schema} spaceId={spaceId} />
                        <PagesSchemaSettingsButton collections={collections} schema={schema} spaceId={spaceId} />
                      </>
                    )}
                  </div>
                </div>
                <PagesCollectionPendingWrites />
                {
                  await PagesCollectionEmptyNotices({
                    emptiness: { hidesEverything, matchesNothing, quickFilterMatchesNothing },
                    search,
                  })
                }
                {!hidesEverything &&
                  !matchesNothing &&
                  !quickFilterMatchesNothing &&
                  (await PagesCollectionView({
                    aggregates,
                    canEdit,
                    changesCursor: reading === null ? null : reading.changesCursor,
                    outcome: reading === null ? null : reading.outcome,
                    personOptions,
                    properties,
                    schema,
                    spaceId,
                    view: activeView,
                    viewerId,
                  }))}
              </section>
            </PagesCollectionWritesProvider>
          </PagesCollectionNoticesProvider>
        </PagesCollectionCardAppearanceProvider>
      </PagesCollectionRowQueryProvider>
    </PagesCollectionLookupsProvider>
  );
};
