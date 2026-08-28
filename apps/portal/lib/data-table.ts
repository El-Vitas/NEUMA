import type { Column, RowData } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/shared/types/table.types';

/**
 * How a pinned column stays in place while the table scrolls sideways.
 *
 * Anchored by the start and the end of the line rather than by left and right,
 * which is what the table library now names them and what keeps the pinning
 * correct in a language written from right to left.
 */
export const getColumnPinningStyle = <TData extends RowData>({
  column,
}: {
  readonly column: Column<DataTableFeatures, TData, unknown>;
}): React.CSSProperties => {
  const isPinned = column.getIsPinned();
  if (!isPinned) return {};

  const isLastPinnedStart = isPinned === 'start' && column.getIsLastColumn('start');
  const isFirstPinnedEnd = isPinned === 'end' && column.getIsFirstColumn('end');

  let boxShadow: string | undefined;
  if (isLastPinnedStart) {
    boxShadow = '-4px 0 4px -4px rgba(0, 0, 0, 0.1) inset';
  } else if (isFirstPinnedEnd) {
    boxShadow = '4px 0 4px -4px rgba(0, 0, 0, 0.1) inset';
  }

  return {
    position: 'sticky',
    insetInlineStart: isPinned === 'start' ? `${column.getStart('start')}px` : undefined,
    insetInlineEnd: isPinned === 'end' ? `${column.getAfter('end')}px` : undefined,
    boxShadow,
  };
};
