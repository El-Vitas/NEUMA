import type { PageColumnAlignment, PageRowHeight } from '@neuma/shared';
import {
  PAGE_COLUMN_ALIGNMENT,
  PAGE_COLUMN_ALIGNMENT_VALUES,
  PAGE_ROW_HEIGHT,
  PAGE_ROW_HEIGHT_VALUES,
} from '@neuma/shared';
import {
  PAGE_TABLE_ALIGNMENT_CLASSES,
  PAGE_TABLE_CONTROL_HEIGHT_CLASSES,
  PAGE_TABLE_LINE_CLAMP_CLASSES,
  PAGE_TABLE_ROW_PADDING_CLASSES,
} from '../constants/pages.table-appearance.constants';
import type { PageTableAppearance } from '../types/pages.table-appearance.types';

/** Padding goes on the cell (it drives row growth); line clamping goes on the content inside it. */
export const readTableAppearance = (rowHeight: PageRowHeight, wrapsText: boolean): PageTableAppearance => ({
  // A table cell does not wrap on its own, so wrapping starts by allowing it here.
  cellClass: `${PAGE_TABLE_ROW_PADDING_CLASSES[rowHeight] ?? PAGE_TABLE_ROW_PADDING_CLASSES[PAGE_ROW_HEIGHT.SHORT]} ${
    wrapsText ? 'whitespace-normal' : 'whitespace-nowrap'
  }`,
  controlClass:
    PAGE_TABLE_CONTROL_HEIGHT_CLASSES[rowHeight] ?? PAGE_TABLE_CONTROL_HEIGHT_CLASSES[PAGE_ROW_HEIGHT.SHORT],
  contentClass: wrapsText
    ? `break-words ${PAGE_TABLE_LINE_CLAMP_CLASSES[rowHeight] ?? PAGE_TABLE_LINE_CLAMP_CLASSES[PAGE_ROW_HEIGHT.SHORT]}`
    : 'truncate',
});

/** Defaults to start, so "start" never has to be stored as a choice. */
export const readAlignmentClass = (
  alignments: Readonly<Record<string, PageColumnAlignment>>,
  columnKey: string,
): string => PAGE_TABLE_ALIGNMENT_CLASSES[alignments[columnKey] ?? PAGE_COLUMN_ALIGNMENT.START];

export const readPageRowHeight = (chosen: string): PageRowHeight =>
  PAGE_ROW_HEIGHT_VALUES.find((candidate) => candidate === chosen) ?? PAGE_ROW_HEIGHT.SHORT;

export const readPageColumnAlignment = (chosen: string): PageColumnAlignment =>
  PAGE_COLUMN_ALIGNMENT_VALUES.find((candidate) => candidate === chosen) ?? PAGE_COLUMN_ALIGNMENT.START;
