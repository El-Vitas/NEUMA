import { getTranslations } from 'next-intl/server';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewOutcome,
} from '../types/pages.schema.types';
import { PagesCollectionFilterBar } from './pages.collection.filter-bar';
import { PagesCollectionTabs } from './pages.collection.tabs';
import { PagesCollectionView } from './pages.collection.view';
import { PagesSchemaSettingsButton } from './pages.schema.settings-button';

interface IProps {
  readonly activeView: PageSchemaView;
  readonly canEdit: boolean;
  readonly outcome: PageViewOutcome | null;
  readonly personOptions?: readonly PagePersonOption[];
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
  outcome,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  schema,
  spaceId,
  views,
}: IProps) => {
  const t = await getTranslations('pages');

  return (
    <section aria-label={t('collection.sectionTitle')} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2 border-border border-b">
        <PagesCollectionTabs activeViewName={activeView.name} label={t('collection.viewsLabel')} views={views} />
        {canEdit && (
          <div className="flex items-center gap-1 pb-1">
            <PagesCollectionFilterBar activeViewName={activeView.name} schema={schema} spaceId={spaceId} />
            <PagesSchemaSettingsButton schema={schema} spaceId={spaceId} />
          </div>
        )}
      </div>
      {
        await PagesCollectionView({
          canEdit,
          collectionPageId: schema.pageId,
          outcome,
          personOptions,
          properties,
          spaceId,
          view: activeView,
        })
      }
    </section>
  );
};
