'use client';

import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { usePagesBoardDrag } from '../hooks/use.pages.board-drag';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';
import type { PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionBoardCard } from './pages.collection.board.card';

interface IProps {
  readonly canEdit: boolean;
  readonly groupByKey: string;
  readonly groups: readonly PageViewGroup[];
  /** What each card says besides its title, already narrowed to what this view shows. */
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/**
 * The rows of a collection as cards in columns, one column per value.
 *
 * A card dropped on a column takes that column's value, so moving something
 * across the board is the whole act of changing it. Every column stays even
 * when empty, because an empty column is a place to drop something and an
 * absent one is not.
 */
export const PagesCollectionBoard = ({ canEdit, groupByKey, groups, properties, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const drag = usePagesBoardDrag(groups, groupByKey, spaceId);

  return (
    <>
      <output aria-live="polite" className="sr-only">
        {drag.announcement}
      </output>
      <div className="flex gap-4 overflow-x-auto pb-2" data-testid="collection-board">
        {groups.map((group) => (
          <section
            aria-label={group.key === UNASSIGNED_GROUP_KEY ? t('collection.unassignedGroup') : group.label}
            className={cn(
              'w-64 shrink-0 space-y-3 rounded-sm p-2 transition-colors',
              drag.hoveredGroupKey === group.key && 'bg-muted',
            )}
            key={group.key}
            onDragLeave={() => drag.onDragLeave(group.key)}
            onDragOver={(event) => {
              if (!canEdit) return;
              event.preventDefault();
              drag.onDragOver(group.key);
            }}
            onDrop={(event) => {
              event.preventDefault();
              drag.onDrop(group.key);
            }}
          >
            <h3 className="flex items-center gap-2 text-sm">
              <span className={cn('rounded-sm px-2 py-0.5 font-medium', readPageOptionColorClass(group.color))}>
                {group.key === UNASSIGNED_GROUP_KEY ? t('collection.unassignedGroup') : group.label}
              </span>
              <span className="text-muted-foreground">{group.rows.length}</span>
            </h3>
            <div className="space-y-2">
              {group.rows.length === 0 && (
                <p className="text-muted-foreground text-xs">{t('collection.emptyColumn')}</p>
              )}
              {group.rows.map((row) => (
                <PagesCollectionBoardCard
                  canEdit={canEdit}
                  drag={drag}
                  groupKey={group.key}
                  key={row.id}
                  properties={properties}
                  row={row}
                  spaceId={spaceId}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
};
