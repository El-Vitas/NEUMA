'use client';

import { GripVertical, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { readPageOptionDotClass } from '../lib/pages.option-color.lib';
import type { PagesBoardColumns } from '../types/pages.board-columns.types';
import type { PageBoardColumnMode } from '../types/pages.board-drag.types';
import type { PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionBoardColumnMenu } from './pages.collection.board.column-menu';

interface IProps {
  readonly canEdit: boolean;
  readonly columns: null | PagesBoardColumns;
  readonly isCreating: boolean;
  readonly label: string;
  readonly limit: null | number;
  readonly mode: PageBoardColumnMode;
  readonly onCollapse: () => void;
  readonly onDragEnd: () => void;
  readonly onDragStart: () => void;
  readonly onLimit: (limit: null | number) => void;
  readonly onModeChange: (mode: PageBoardColumnMode) => void;
  readonly onNameStart: () => void;
  readonly onRename: (name: string) => void;
  readonly group: PageViewGroup;
}

/** Rename and limit are answered inline, with the header turning into the field, instead of in a separate dialog. */
export const PagesCollectionBoardColumnHeader = ({
  canEdit,
  columns,
  group,
  isCreating,
  label,
  limit,
  mode,
  onCollapse,
  onDragEnd,
  onDragStart,
  onLimit,
  onModeChange,
  onNameStart,
  onRename,
}: IProps) => {
  const t = useTranslations('pages');

  const answerKey = (event: KeyboardEvent<HTMLInputElement>, answer: (value: string) => void): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      answer(event.currentTarget.value);
      return;
    }
    if (event.key === 'Escape') onModeChange('NAMED');
  };

  const limitTo = (written: string): void => {
    onModeChange('NAMED');
    const asked = Number.parseInt(written, 10);
    onLimit(written.trim() === '' || Number.isNaN(asked) || asked < 1 ? null : asked);
  };

  if (mode === 'RENAMING') {
    return (
      <input
        aria-label={t('collection.renameColumnTo', { column: label })}
        // biome-ignore lint/a11y/noAutofocus: the field answers the menu choice that just opened it
        autoFocus
        className="min-w-0 flex-1 rounded-sm bg-background/70 px-2 py-0.5 font-medium text-foreground text-sm outline-none"
        defaultValue={group.label}
        disabled={columns?.isBusy}
        onBlur={(event) => onRename(event.target.value)}
        onKeyDown={(event) => answerKey(event, onRename)}
      />
    );
  }

  if (mode === 'LIMITING') {
    return (
      <input
        aria-label={t('collection.columnLimitFor', { column: label })}
        // biome-ignore lint/a11y/noAutofocus: the field answers the menu choice that just opened it
        autoFocus
        className="min-w-0 flex-1 rounded-sm bg-background/70 px-2 py-0.5 font-medium text-foreground text-sm outline-none"
        defaultValue={limit === null ? '' : String(limit)}
        disabled={columns?.isBusy}
        min={1}
        onBlur={(event) => limitTo(event.target.value)}
        onKeyDown={(event) => answerKey(event, limitTo)}
        placeholder={t('collection.columnLimitPlaceholder')}
        type="number"
      />
    );
  }

  /** Keyboard alternative to dragging the column. */
  const answerHandleKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!event.altKey || columns === null) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    columns.moveColumnSideways(group.key, event.key === 'ArrowLeft' ? 'EARLIER' : 'LATER');
  };

  return (
    <>
      {columns !== null && (
        <button
          aria-label={t('collection.moveColumn', { column: label })}
          className="-ml-1 cursor-grab text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          data-testid="board-column-handle"
          draggable
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
          onKeyDown={answerHandleKey}
          type="button"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      )}
      <h3 className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 rounded-sm bg-background/70 px-2 py-0.5 font-medium text-foreground">
          <span
            aria-hidden="true"
            className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(group.color))}
          />
          <span className="truncate">{label}</span>
        </span>
        <span className="text-muted-foreground tabular-nums">
          {limit === null ? group.rows.length : `${group.rows.length}/${limit}`}
        </span>
      </h3>
      {columns !== null && (
        <PagesCollectionBoardColumnMenu
          color={group.color}
          columns={columns}
          isCollapsed={false}
          label={label}
          onCollapse={onCollapse}
          onLimitStart={() => onModeChange('LIMITING')}
          onRemoveAsk={() => onModeChange('REMOVING')}
          onRenameStart={() => onModeChange('RENAMING')}
          value={group.key}
        />
      )}
      {canEdit && (
        <Button
          aria-label={t('collection.newRowIn', { column: label })}
          className="size-8 text-muted-foreground hover:text-foreground"
          disabled={isCreating}
          onClick={onNameStart}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      )}
    </>
  );
};
