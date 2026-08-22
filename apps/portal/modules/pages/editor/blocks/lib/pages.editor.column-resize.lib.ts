import { PAGE_EDITOR_COLUMN_MINIMUM_WIDTH } from '../constants/pages.editor.blocks.constants';

/**
 * Shares a row's width between its columns.
 *
 * A column with no width of its own takes an equal share, which is what a row
 * looks like right after it is created.
 */
export const readPageEditorColumnWidths = (widths: readonly (number | null)[]): readonly number[] => {
  const evenShare = widths.length === 0 ? 0 : 1 / widths.length;
  const known = widths.map((width) => (typeof width === 'number' && width > 0 ? width : evenShare));
  const total = known.reduce((sum, width) => sum + width, 0);
  return total === 0 ? known : known.map((width) => width / total);
};

/**
 * Moves the divider between two columns to where the pointer is, taking the
 * width from one neighbour and giving it to the other, so the rest of the row
 * stays exactly as it was.
 *
 * Neither neighbour can be squeezed past `PAGE_EDITOR_COLUMN_MINIMUM_WIDTH`,
 * so a column can always be seen and written in.
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
