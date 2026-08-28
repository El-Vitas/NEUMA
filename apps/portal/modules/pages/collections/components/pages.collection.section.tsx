import { getTranslations } from 'next-intl/server';
import type { PageSchema, PageSchemaProperty, PageSchemaView, PageViewOutcome } from '../types/pages.schema.types';
import { PagesCollectionTabs } from './pages.collection.tabs';
import { PagesCollectionView } from './pages.collection.view';
import { PagesSchemaSettingsButton } from './pages.schema.settings-button';

interface IProps {
  readonly activeView: PageSchemaView;
  readonly canEdit: boolean;
  readonly outcome: PageViewOutcome | null;
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
  properties,
  schema,
  spaceId,
  views,
}: IProps) => {
  const t = await getTranslations('pages');

  return (
    <section aria-label={t('collection.sectionTitle')} className="space-y-4 pt-6">
      <div className="flex items-end justify-between gap-2">
        <PagesCollectionTabs activeViewName={activeView.name} label={t('collection.viewsLabel')} views={views} />
        {canEdit && <PagesSchemaSettingsButton schema={schema} spaceId={spaceId} />}
      </div>
      {await PagesCollectionView({ canEdit, outcome, properties, spaceId, view: activeView })}
    </section>
  );
};
