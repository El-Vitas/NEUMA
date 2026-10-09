import { PAGE_EDITOR_COLUMN_MINIMUM_WIDTH } from '../constants/pages.editor.blocks.constants';

/** Normalizes column widths to sum to 1; a column with no width of its own takes an equal share. */
export const readPageEditorColumnWidths = (widths: readonly (number | null)[]): readonly number[] => {
  const evenShare = widths.length === 0 ? 0 : 1 / widths.length;
  const known = widths.map((width) => (typeof width === 'number' && width > 0 ? width : evenShare));
  const total = known.reduce((sum, width) => sum + width, 0);
  return total === 0 ? known : known.map((width) => width / total);
};

/**
 * Moves the divider between two columns to the pointer, trading width between the neighbours only.
 * Neither neighbour shrinks below `PAGE_EDITOR_COLUMN_MINIMUM_WIDTH`.
 */
export const resizePageEditorColumns = (parameters: {
  readonly boundaryIndex: number;
  readonly pointerRatio: number;
  readonly widths: readonly number[];
}): readonly number[] => {
  const { boundaryIndex, pointerRatio, widths } = parameters;
  const left = widths[boundaryIndex];
  const right = widths[boundaryIndex + 1];
  if (left === undefined || right === undefined) return widths;

  const startOfLeft = widths.slice(0, boundaryIndex).reduce((sum, width) => sum + width, 0);
  const pair = left + right;
  const wantedLeft = pointerRatio - startOfLeft;
  const nextLeft = Math.min(
    Math.max(wantedLeft, PAGE_EDITOR_COLUMN_MINIMUM_WIDTH),
    pair - PAGE_EDITOR_COLUMN_MINIMUM_WIDTH,
  );
  return widths.map((width, index) => {
    if (index === boundaryIndex) return nextLeft;
    if (index === boundaryIndex + 1) return pair - nextLeft;
    return width;
  });
};
