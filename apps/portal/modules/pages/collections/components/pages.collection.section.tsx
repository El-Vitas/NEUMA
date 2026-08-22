import { getTranslations } from 'next-intl/server';
import type { PageSchemaProperty, PageSchemaView, PageViewOutcome } from '../types/pages.schema.types';
import { PagesCollectionViewOutcome } from './pages.collection.view-outcome';

interface IProps {
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
  readonly views: readonly { readonly outcome: PageViewOutcome | null; readonly view: PageSchemaView }[];
}

export const PagesCollectionSection = async ({ properties, spaceId, views }: IProps) => {
  if (views.length === 0) return null;
  const t = await getTranslations('pages');

  const viewSections = await Promise.all(
    views.map(async ({ outcome, view }) => (
      <div className="space-y-3" key={view.name}>
        <h3 className="text-muted-foreground text-xs uppercase tracking-wide">{view.name}</h3>
        {await PagesCollectionViewOutcome({ outcome, properties, spaceId })}
      </div>
    )),
  );

  return (
    <section aria-label={t('collection.sectionTitle')} className="max-w-336 space-y-8 border-border border-t pt-6">
      <h2 className="font-medium text-foreground text-sm">{t('collection.sectionTitle')}</h2>
      {viewSections}
    </section>
  );
};
