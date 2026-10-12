'use client';

import { PAGE_COLUMN_ALIGNMENT_VALUES } from '@neuma/shared';
import { GripVertical, Pin, PinOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { TableHead } from '@/shared/components/ui/table';
import { PAGE_TABLE_COLUMN_WIDTH_STEP } from '../constants/pages.collections.constants';
import { clampTableColumnWidth } from '../lib/pages.table-columns.lib';
import type { PagesTableColumns } from '../types/pages.table-columns.types';

interface IProps {
  readonly columnKey: string;
  readonly columns: null | PagesTableColumns;
  readonly frozen: { readonly className?: string; readonly style?: { readonly left: number } };
  readonly headerId: string;
  readonly label: string;
  readonly leading?: ReactNode;
  /** False for the title column: it stays first because it opens each row. */
  readonly movable: boolean;
  readonly onDragEnd: () => void;
  readonly onDragOver: () => void;
  readonly onDrop: () => void;
  readonly onDragStart: () => void;
  readonly onResize: (width: number) => void;
  readonly onResizeEnd: (width: number) => void;
  readonly position: number;
  readonly width: number;
}

export const PagesCollectionTableHeaderCell = ({
  columnKey,
  columns,
  frozen,
  headerId,
  label,
  leading = null,
  movable,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onResize,
  onResizeEnd,
  position,
  width,
}: IProps) => {
  const t = useTranslations('pages.collection');

  const answerHandleKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!event.altKey || columns === null) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    columns.moveColumnSideways(columnKey, event.key === 'ArrowLeft' ? 'EARLIER' : 'LATER');
  };

  const answerResizeKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!event.altKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? -PAGE_TABLE_COLUMN_WIDTH_STEP : PAGE_TABLE_COLUMN_WIDTH_STEP;
    onResizeEnd(clampTableColumnWidth(width + step));
  };

  /** The width follows the pointer and is saved only on release, to avoid one call per pixel. */
  const startResizing = (event: PointerEvent<HTMLButtonElement>): void => {
    const from = event.clientX;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    let last = width;
    const follow = (moved: globalThis.PointerEvent): void => {
      last = clampTableColumnWidth(width + moved.clientX - from);
      onResize(last);
    };
    const finish = (): void => {
      handle.removeEventListener('pointermove', follow);
      handle.removeEventListener('pointerup', finish);
      onResizeEnd(last);
    };
    handle.addEventListener('pointermove', follow);
    handle.addEventListener('pointerup', finish);
  };

  return (
    <TableHead
      className={cn('relative', frozen.className, frozen.className !== undefined && 'z-20')}
      id={headerId}
      onDragOver={(event) => {
        if (columns === null || !movable) return;
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => {
        if (columns === null || !movable) return;
        event.preventDefault();
        onDrop();
      }}
      style={frozen.style}
    >
      <span className="flex items-center gap-1">
        {columns !== null && movable && (
          <button
            aria-label={t('moveTableColumn', { column: label })}
            className="-ml-1 cursor-grab text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            data-testid="table-column-handle"
            draggable
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
            onKeyDown={answerHandleKey}
            type="button"
          >
            <GripVertical aria-hidden="true" className="size-3.5" />
          </button>
        )}
        {leading}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {columns !== null && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('tableColumnActions', { column: label })}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              data-testid="table-column-menu"
              type="button"
            >
              {frozen.className === undefined ? (
                <PinOff aria-hidden="true" className="size-3.5" />
              ) : (
                <Pin aria-hidden="true" className="size-3.5" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onSelect={() => columns.setFrozenColumns(position + 1)}>
                <Pin aria-hidden="true" className="size-4" />
                {t('freezeHere')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => columns.setFrozenColumns(0)}>
                <PinOff aria-hidden="true" className="size-4" />
                {t('freezeNone')}
              </DropdownMenuItem>
              {PAGE_COLUMN_ALIGNMENT_VALUES.map((alignment) => (
                <DropdownMenuItem key={alignment} onSelect={() => columns.setAlignment(columnKey, alignment)}>
                  {t(`alignments.${alignment}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </span>
      {columns !== null && (
        <button
          aria-label={t('resizeColumn', { column: label })}
          /* Inside the cell and above it: half outside, the next column covered the handle. */
          className="absolute inset-y-0 right-0 z-30 w-3 cursor-col-resize hover:bg-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
          data-testid="table-column-resize"
          onKeyDown={answerResizeKey}
          onPointerDown={startResizing}
          type="button"
        />
      )}
    </TableHead>
  );
};
