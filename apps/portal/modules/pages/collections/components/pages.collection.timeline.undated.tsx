'use client';

import { useTranslations } from 'next-intl';
import { PagesSidePanelLink } from '../../navigation/components/pages.side-panel.link';
import type { PageRow } from '../types/pages.schema.types';

interface IProps {
  readonly rows: readonly PageRow[];
  /** All the rows with no start, which may be more than the ones listed. */
  readonly total: number;
}

/** Rows with no start have no place in time; listing them apart keeps them from looking deleted. */
export const PagesCollectionTimelineUndated = ({ rows, total }: IProps) => {
  const t = useTranslations('pages');
  if (total === 0) return null;

  return (
    <section className="space-y-1" data-testid="timeline-undated">
      <h4 className="px-1 text-muted-foreground text-xs">{t('collection.timelineUndated', { count: total })}</h4>
      <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
        {rows.map((row) => (
          <li className="rounded-sm bg-muted px-2 py-1 text-xs" key={row.id}>
            <PagesSidePanelLink className="underline-offset-2 hover:underline" pageId={row.id}>
              {row.title.length > 0 ? row.title : t('untitled')}
            </PagesSidePanelLink>
          </li>
        ))}
        {total > rows.length && (
          <li className="px-2 py-1 text-muted-foreground text-xs">
            {t('collection.timelineUndatedMore', { count: total - rows.length })}
          </li>
        )}
      </ul>
    </section>
  );
};
