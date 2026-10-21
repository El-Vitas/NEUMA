import { PAGE_VIEW_TYPE, readPageViewConfiguration } from '@neuma/shared';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { NO_PAGE_AGGREGATES } from '../constants/pages.aggregates.constants';
import { EMPTY_PAGE_COLLECTION_LOOKUPS } from '../constants/pages.lookups.constants';
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
import { PagesCollectionFilterBar } from './pages.collection.filter-bar';
import { PagesCollectionLookupsProvider } from './pages.collection.lookups.provider';
import { PagesCollectionRowCount } from './pages.collection.row-count';
import { PagesCollectionRowQueryProvider } from './pages.collection.row-query.provider';
import { PagesCollectionSearchField } from './pages.collection.search-field';
import { PagesCollectionTabs } from './pages.collection.tabs';
import { PagesCollectionView } from './pages.collection.view';
import { PagesSchemaSettingsButton } from './pages.schema.settings-button';

interface IProps {
  readonly activeView: PageSchemaView;
  readonly canEdit: boolean;
  readonly personOptions?: readonly PagePersonOption[];
  readonly reading: PageViewReading | null;
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  /** The words the rows were read with; empty when the view is not being searched. */
  readonly search?: string;
  readonly spaceId: string;
  readonly views: readonly PageSchemaView[];
}

export const PagesCollectionSection = async ({
  activeView,
  canEdit,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  reading,
  schema,
  search = '',
  spaceId,
  views,
}: IProps) => {
  const t = await getTranslations('pages');
  const collectionsResult = canEdit ? await getSpaceCollections(spaceId) : null;
  const collections = collectionsResult?.isOk() === true ? collectionsResult.getValue() : [];
  const aggregates = reading === null ? NO_PAGE_AGGREGATES : reading.aggregates;
  const hasFilter = readPageViewConfiguration(activeView.configuration).filter !== null;
  const hidesEverything = reading !== null && hasFilter && search === '' && isOutcomeEmpty(reading.outcome);
  const matchesNothing =
    reading !== null && search !== '' && activeView.type !== PAGE_VIEW_TYPE.CALENDAR && isOutcomeEmpty(reading.outcome);
  const lookups: PageCollectionLookups =
    reading === null
      ? { ...EMPTY_PAGE_COLLECTION_LOOKUPS, people: personOptions }
      : { attachedFiles: reading.attachedFiles, people: personOptions, relatedRows: reading.relatedRows };

  return (
    <PagesCollectionLookupsProvider lookups={lookups}>
      <PagesCollectionRowQueryProvider search={search}>
        <section aria-label={t('collection.sectionTitle')} className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2 border-border border-b">
            <PagesCollectionTabs
              activeViewName={activeView.name}
              label={t('collection.viewsLabel')}
              search={search}
              views={views}
            />
            <div className="flex items-center gap-1 pb-1">
              {reading !== null && <PagesCollectionRowCount aggregates={aggregates} />}
              {activeView.type !== PAGE_VIEW_TYPE.CHART && (
                <PagesCollectionSearchField activeViewName={activeView.name} search={search} />
              )}
              {canEdit && (
                <>
                  <PagesCollectionFilterBar activeViewName={activeView.name} schema={schema} spaceId={spaceId} />
                  <PagesSchemaSettingsButton collections={collections} schema={schema} spaceId={spaceId} />
                </>
              )}
            </div>
          </div>
          {hidesEverything && <EmptyState message={t('collection.everythingFiltered')} />}
          {matchesNothing && (
            <p className="px-1 py-6 text-center text-muted-foreground text-sm" data-testid="search-no-matches">
              {t('collection.searchNoMatches', { query: search })}
            </p>
          )}
          {!hidesEverything &&
            !matchesNothing &&
            (await PagesCollectionView({
              aggregates,
              canEdit,
              outcome: reading === null ? null : reading.outcome,
              personOptions,
              properties,
              schema,
              spaceId,
              view: activeView,
            }))}
        </section>
      </PagesCollectionRowQueryProvider>
    </PagesCollectionLookupsProvider>
  );
};
