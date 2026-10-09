import type { PageColumnAlignment, PageRowHeight } from '@company-brain/shared';

/** Padding, not height: a table cell grows with its content and ignores a fixed height. */
export const PAGE_TABLE_ROW_PADDING_CLASSES: Readonly<Record<PageRowHeight, string>> = {
  MEDIUM: 'py-3',
  SHORT: 'py-1',
  TALL: 'py-6',
};

/** The shortest is 44px, the minimum touch target. */
export const PAGE_TABLE_CONTROL_HEIGHT_CLASSES: Readonly<Record<PageRowHeight, string>> = {
  MEDIUM: 'min-h-14',
  SHORT: 'min-h-11',
  TALL: 'min-h-24',
};

/** Without a cap, a row holding a paragraph would grow to half the screen and the chosen height would mean nothing. */
export const PAGE_TABLE_LINE_CLAMP_CLASSES: Readonly<Record<PageRowHeight, string>> = {
  MEDIUM: 'line-clamp-3',
  SHORT: 'line-clamp-1',
  TALL: 'line-clamp-6',
};

/** Both text alignment and flex justification: the full-width button inside a cell aligns as a box. */
export const PAGE_TABLE_ALIGNMENT_CLASSES: Readonly<Record<PageColumnAlignment, string>> = {
  CENTER: 'text-center justify-center',
  END: 'text-right justify-end',
  START: 'text-left justify-start',
};
