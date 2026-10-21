import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { EMPTY_PAGE_COLLECTION_LOOKUPS } from '../constants/pages.lookups.constants';
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
  spaceId,
  views,
}: IProps) => {
  const t = await getTranslations('pages');
  const collectionsResult = canEdit ? await getSpaceCollections(spaceId) : null;
  const collections = collectionsResult?.isOk() === true ? collectionsResult.getValue() : [];
  const hidesEverything = reading !== null && reading.rowCount === 0 && reading.totalRowCount > 0;
  const lookups: PageCollectionLookups =
    reading === null
      ? { ...EMPTY_PAGE_COLLECTION_LOOKUPS, people: personOptions }
      : { attachedFiles: reading.attachedFiles, people: personOptions, relatedRows: reading.relatedRows };

  return (
    <PagesCollectionLookupsProvider lookups={lookups}>
      <section aria-label={t('collection.sectionTitle')} className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-border border-b">
          <PagesCollectionTabs activeViewName={activeView.name} label={t('collection.viewsLabel')} views={views} />
          {canEdit && (
            <div className="flex items-center gap-1 pb-1">
              {reading !== null && (
                <span className="px-1 text-muted-foreground text-xs tabular-nums">
                  {t('collection.rowCount', { shown: reading.rowCount, total: reading.totalRowCount })}
                </span>
              )}
              <PagesCollectionFilterBar activeViewName={activeView.name} schema={schema} spaceId={spaceId} />
              <PagesSchemaSettingsButton collections={collections} schema={schema} spaceId={spaceId} />
            </div>
          )}
        </div>
        {reading?.hasMore === true && (
          <p className="text-muted-foreground text-xs" data-testid="collection-partial">
            {t('collection.onlyFirstRows', { shown: reading.totalRowCount })}
          </p>
        )}
        {hidesEverything ? (
          <EmptyState message={t('collection.everythingFiltered', { total: reading.totalRowCount })} />
        ) : (
          await PagesCollectionView({
            canEdit,
            outcome: reading === null ? null : reading.outcome,
            personOptions,
            properties,
            schema,
            spaceId,
            view: activeView,
          })
        )}
      </section>
    </PagesCollectionLookupsProvider>
  );
};
