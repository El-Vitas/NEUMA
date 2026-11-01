'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { readPageOptionDotClass, readPageOptionSurfaceClass } from '../lib/pages.option-color.lib';
import type { PageBoardColumnDrag } from '../types/pages.board-drag.types';
import type { PageViewAggregates, PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionGroupCount } from './pages.collection.group-count';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** Empty when the board has no bands. */
  readonly bandKey: string;
  readonly columnDrag: PageBoardColumnDrag;
  readonly group: PageViewGroup;
  readonly label: string;
  readonly onUnfold: () => void;
}

/** Still a drop target for columns, otherwise a folded column would split the board in two. */
export const PagesCollectionBoardColumnFolded = ({
  aggregates,
  bandKey,
  columnDrag,
  group,
  label,
  onUnfold,
}: IProps) => {
  const t = useTranslations('pages');

  return (
    <button
      aria-label={t('collection.unfoldColumnNamed', { column: label })}
      className={cn(
        'flex w-11 shrink-0 flex-col items-center gap-2 rounded-lg py-3',
        readPageOptionSurfaceClass(group.color),
        columnDrag.carried === group.key && 'opacity-50',
        columnDrag.carried !== null && columnDrag.target === group.key && 'ring-2 ring-primary',
      )}
      data-testid="board-column-collapsed"
      onClick={onUnfold}
      onDragOver={(event) => {
        if (columnDrag.carried === null) return;
        event.preventDefault();
        columnDrag.onOver(group.key);
      }}
      onDrop={(event) => {
        if (columnDrag.carried === null) return;
        event.preventDefault();
        columnDrag.onDropOn(group.key);
      }}
      type="button"
    >
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(group.color))} />
      <span className="font-medium text-muted-foreground text-xs tabular-nums">
        <PagesCollectionGroupCount
          aggregates={aggregates}
          drawn={group.rows.length}
          groupKey={group.key}
          subKey={bandKey}
        />
      </span>
      {/* Vertical: a 44px strip cannot fit the name written horizontally. */}
      <span className="truncate font-medium text-foreground text-sm [writing-mode:vertical-rl]">{label}</span>
    </button>
  );
};
