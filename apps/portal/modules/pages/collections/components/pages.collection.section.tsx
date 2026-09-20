import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewReading,
} from '../types/pages.schema.types';
import { PagesCollectionFilterBar } from './pages.collection.filter-bar';
import { PagesCollectionTabs } from './pages.collection.tabs';
import { PagesCollectionView } from './pages.collection.view';
import { PagesSchemaSettingsButton } from './pages.schema.settings-button';

interface IProps {
  readonly activeView: PageSchemaView;
  readonly canEdit: boolean;
  readonly personOptions?: readonly PagePersonOption[];
  /** Las filas tal como esta vista las lee, y de cuántas salieron. Nada cuando no se pudieron leer. */
  readonly reading: PageViewReading | null;
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly views: readonly PageSchemaView[];
}

/**
 * The collection a page carries, shown as the page's own content rather than as
 * a list tacked on after it.
 *
 * One view at a time, with the rest a click away, because a collection with
 * four views stacked one under another is four times the same rows and no way
 * to point at one of them.
 */
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
  /**
   * Un filtro que no deja pasar nada no es una colección vacía, y decir «aún no
   * hay filas» manda a agregar una que ya está ahí, escondida detrás de una
   * condición que nadie recuerda haber puesto.
   */
  const hidesEverything = reading !== null && reading.rowCount === 0 && reading.totalRowCount > 0;

  return (
    <section aria-label={t('collection.sectionTitle')} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2 border-border border-b">
        <PagesCollectionTabs activeViewName={activeView.name} label={t('collection.viewsLabel')} views={views} />
        {canEdit && (
          <div className="flex items-center gap-1 pb-1">
            {/* Cuántas se están viendo de cuántas hay: sin las dos cuentas, un filtro puesto no se nota. */}
            {reading !== null && (
              <span className="px-1 text-muted-foreground text-xs tabular-nums">
                {t('collection.rowCount', { shown: reading.rowCount, total: reading.totalRowCount })}
              </span>
            )}
            <PagesCollectionFilterBar activeViewName={activeView.name} schema={schema} spaceId={spaceId} />
            <PagesSchemaSettingsButton schema={schema} spaceId={spaceId} />
          </div>
        )}
      </div>
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
  );
};
