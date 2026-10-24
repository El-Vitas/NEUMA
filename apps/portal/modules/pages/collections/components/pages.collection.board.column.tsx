'use client';

import { UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { readPageOptionSurfaceClass } from '../lib/pages.option-color.lib';
import type { PagesBoardColumns } from '../types/pages.board-columns.types';
import type {
  PageBoardColumnDrag,
  PageBoardColumnMode,
  PageBoardDragController,
} from '../types/pages.board-drag.types';
import type {
  PagePersonOption,
  PageSchemaProperty,
  PageViewAggregates,
  PageViewGroup,
} from '../types/pages.schema.types';
import { PagesCollectionBoardColumnCards } from './pages.collection.board.column.cards';
import { PagesCollectionBoardColumnFolded } from './pages.collection.board.column.folded';
import { PagesCollectionBoardColumnHeader } from './pages.collection.board.column-header';
import { PagesCollectionBoardColumnRemoveDialog } from './pages.collection.board.column-remove.dialog';
import { PagesCollectionLoadMoreButton } from './pages.collection.load-more.button';
import { PagesCollectionNewRow } from './pages.collection.new-row';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** Empty when the board has no bands. */
  readonly bandKey: string;
  readonly canDrag: boolean;
  readonly canEdit: boolean;
  readonly columnDrag: PageBoardColumnDrag;
  /** Null when the column is not an editable value. */
  readonly columns: null | PagesBoardColumns;
  readonly drag: PageBoardDragController;
  readonly group: PageViewGroup;
  readonly isCollapsed: boolean;
  readonly isCreating: boolean;
  readonly isLoadingMore: boolean;
  readonly isNaming: boolean;
  readonly onCreate: (title: string) => void;
  readonly onLoadMore: () => void;
  readonly onNameCancel: () => void;
  readonly onNameStart: () => void;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/** Rendered even when empty, since an empty column is still a drop target; the same piece is reused inside bands. */
export const PagesCollectionBoardColumn = ({
  aggregates,
  bandKey,
  canDrag,
  canEdit,
  columnDrag,
  columns,
  drag,
  group,
  isCollapsed,
  isCreating,
  isLoadingMore,
  isNaming,
  onCreate,
  onLoadMore,
  onNameCancel,
  onNameStart,
  personOptions,
  properties,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');
  const [mode, setMode] = useState<PageBoardColumnMode>('NAMED');
  const isAimingAt = (beforeRowId: null | string): boolean =>
    columnDrag.carried === null &&
    drag.target !== null &&
    drag.target.bandKey === bandKey &&
    drag.target.groupKey === group.key &&
    drag.target.beforeRowId === beforeRowId;
  const label = group.key === UNASSIGNED_GROUP_KEY ? t('collection.unassignedGroup') : group.label;
  const limit = columns?.limits[group.key] ?? null;
  const isOverLimit = limit !== null && group.rows.length > limit;

  const renameTo = (name: string): void => {
    setMode('NAMED');
    if (name.trim() !== '' && name !== group.label) columns?.renameColumn(group.key, name.trim());
  };

  if (isCollapsed) {
    return (
      <PagesCollectionBoardColumnFolded
        aggregates={aggregates}
        bandKey={bandKey}
        columnDrag={columnDrag}
        group={group}
        label={label}
        onUnfold={() => columns?.toggleCollapsed(group.key)}
      />
    );
  }

  return (
    <section
      aria-label={label}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-lg',
        readPageOptionSurfaceClass(group.color),
        columnDrag.carried === group.key && 'opacity-50',
        columnDrag.carried !== null && columnDrag.target === group.key && 'ring-2 ring-primary',
      )}
      data-testid="board-column"
      onDragLeave={() => drag.onDragLeave(group.key)}
      /* A dragged column offers gaps between columns only, so a drop never means two things at once. */
      onDragOver={(event) => {
        if (columnDrag.carried !== null) {
          event.preventDefault();
          columnDrag.onOver(group.key);
          return;
        }
        if (!canDrag) return;
        event.preventDefault();
        drag.onDragOver({ bandKey, beforeRowId: null, groupKey: group.key });
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (columnDrag.carried !== null) {
          columnDrag.onDropOn(group.key);
          return;
        }
        drag.onDrop();
      }}
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <PagesCollectionBoardColumnHeader
          aggregates={aggregates}
          bandKey={bandKey}
          canEdit={canEdit}
          columns={columns}
          group={group}
          isCreating={isCreating}
          label={label}
          limit={limit}
          mode={mode}
          onCollapse={() => columns?.toggleCollapsed(group.key)}
          onDragEnd={columnDrag.onEnd}
          onDragStart={() => columnDrag.onStart(group.key)}
          onLimit={(asked) => columns?.setLimit(group.key, asked)}
          onModeChange={setMode}
          onNameStart={onNameStart}
          onRename={renameTo}
        />
      </div>
      {/* The limit is advisory: the message shows but drops are still accepted. */}
      {isOverLimit && (
        <p className="px-3 pb-2 text-muted-foreground text-xs" data-testid="board-column-over-limit">
          {t('collection.columnOverLimit', { limit })}
        </p>
      )}
      {mode === 'REMOVING' && columns !== null && (
        <PagesCollectionBoardColumnRemoveDialog
          isBusy={columns.isBusy}
          label={label}
          onClose={() => setMode('NAMED')}
          onConfirm={() => {
            setMode('NAMED');
            columns.removeColumn(group.key);
          }}
          rowCount={group.rows.length}
        />
      )}
      <div className="px-2 pb-2">
        {group.rows.length === 0 && (
          <p className="px-1 py-2 text-muted-foreground text-xs">{t('collection.emptyColumn')}</p>
        )}
        <PagesCollectionBoardColumnCards
          bandKey={bandKey}
          canDrag={canDrag}
          drag={drag}
          group={group}
          isAimingAt={isAimingAt}
          isCarryingColumn={columnDrag.carried !== null}
          personOptions={personOptions}
          properties={properties}
          spaceId={spaceId}
        />
        <div
          aria-hidden="true"
          className={cn(
            'mt-1 h-0.5 rounded-full transition-colors',
            isAimingAt(null) && group.rows.length > 0 && 'bg-primary',
          )}
        />
        {(group.nextCursor ?? null) !== null && (
          <PagesCollectionLoadMoreButton isLoading={isLoadingMore} onLoad={onLoadMore} />
        )}
        {isNaming && (
          <PagesCollectionNewRow
            disabled={isCreating}
            label={t('collection.newRowIn', { column: label })}
            onCancel={onNameCancel}
            onConfirm={onCreate}
          />
        )}
        {canEdit && !isNaming && (
          <Button
            className="mt-1 w-full justify-start rounded-md text-muted-foreground hover:text-foreground"
            disabled={isCreating}
            onClick={onNameStart}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t('collection.newRow')}
          </Button>
        )}
      </div>
    </section>
  );
};
