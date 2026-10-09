'use client';

import type { PageColumnAlignment, PageRowHeight } from '@company-brain/shared';
import { PAGE_ROW_HEIGHT } from '@company-brain/shared';
import {
  moveViewProperty,
  moveViewPropertySideways,
  readViewColumnAlignments,
  readViewColumnWidths,
  readViewFrozenColumns,
  readViewRowHeight,
  readViewWrapsText,
  setViewColumnAlignment,
  setViewColumnWidth,
  setViewFrozenColumns,
  setViewRowHeight,
  toggleViewWrapsText,
} from '../lib/pages.view-filtering.lib';
import type { PageSchema } from '../types/pages.schema.types';
import type { PagesTableColumns } from '../types/pages.table-columns.types';
import { usePagesViewSaving } from './use.pages.view-saving';

/** Width, order and frozen count belong to the view, not the collection. */
export const usePagesTableColumns = (
  schema: PageSchema,
  activeViewName: string,
  shownKeys: readonly string[],
  spaceId: string,
): PagesTableColumns => {
  const { apply, isSaving, views } = usePagesViewSaving(schema, activeViewName, spaceId);
  const activeView = views.find((view) => view.name === activeViewName) ?? null;

  return {
    frozenColumns: activeView === null ? 0 : readViewFrozenColumns(activeView),
    isBusy: isSaving,
    moveColumn: (propertyKey: string, beforeKey: null | string) =>
      apply((current) => moveViewProperty(current, activeViewName, shownKeys, propertyKey, beforeKey)),
    moveColumnSideways: (propertyKey: string, direction: 'EARLIER' | 'LATER') =>
      apply((current) => moveViewPropertySideways(current, activeViewName, shownKeys, propertyKey, direction)),
    alignments: activeView === null ? {} : readViewColumnAlignments(activeView),
    rowHeight: activeView === null ? PAGE_ROW_HEIGHT.SHORT : readViewRowHeight(activeView),
    setAlignment: (columnKey: string, alignment: PageColumnAlignment) =>
      apply((current) => setViewColumnAlignment(current, activeViewName, columnKey, alignment)),
    setFrozenColumns: (count: number) => apply((current) => setViewFrozenColumns(current, activeViewName, count)),
    setRowHeight: (rowHeight: PageRowHeight) =>
      apply((current) => setViewRowHeight(current, activeViewName, rowHeight)),
    setWidth: (propertyKey: string, width: number) =>
      apply((current) => setViewColumnWidth(current, activeViewName, propertyKey, width)),
    toggleWrapsText: () => apply((current) => toggleViewWrapsText(current, activeViewName)),
    widths: activeView === null ? {} : readViewColumnWidths(activeView),
    wrapsText: activeView !== null && readViewWrapsText(activeView),
  };
};
