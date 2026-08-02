import type { Column } from '@tanstack/react-table';

export const getColumnPinningStyle = <TData>({ column }: { readonly column: Column<TData> }): React.CSSProperties => {
  const isPinned = column.getIsPinned();
  if (!isPinned) return {};

  const isLastPinnedLeft = isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstPinnedRight = isPinned === 'right' && column.getIsFirstColumn('right');

  let boxShadow: string | undefined;
  if (isLastPinnedLeft) {
    boxShadow = '-4px 0 4px -4px rgba(0, 0, 0, 0.1) inset';
  } else if (isFirstPinnedRight) {
    boxShadow = '4px 0 4px -4px rgba(0, 0, 0, 0.1) inset';
  }

  return {
    position: 'sticky',
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    boxShadow,
  };
};
