import type { PageFilter, PageFilterGroup } from '@neuma/shared';
import { PAGE_VIEW_TYPE, readPageViewConfiguration } from '@neuma/shared';
import { PAGE_QUICK_FILTER_VIEW_NAME } from '../constants/pages.view-filtering.constants';
import type { PageSchemaViewDraft } from '../types/pages.schema.types';
import { readViewFilterRoot } from './pages.view-filtering.lib';

const draftOf = (filter: PageFilter | null): PageSchemaViewDraft => ({
  configuration: { filter },
  isDefault: false,
  name: PAGE_QUICK_FILTER_VIEW_NAME,
  type: PAGE_VIEW_TYPE.TABLE,
});

/** The quick filter as the editor of conditions holds it: always a group, empty when there is none. */
export const readQuickFilterRoot = (filter: PageFilter | null): PageFilterGroup => readViewFilterRoot(draftOf(filter));

/**
 * Edits the quick filter with the same operations that edit the filter of a view, by lending them a view that exists
 * only for the edit. Null once no condition is left.
 */
export const editQuickFilter = (
  filter: PageFilter | null,
  edit: (views: readonly PageSchemaViewDraft[], viewName: string) => readonly PageSchemaViewDraft[],
): PageFilter | null => {
  const edited = edit([draftOf(filter)], PAGE_QUICK_FILTER_VIEW_NAME).at(0);
  return edited === undefined ? null : readPageViewConfiguration(edited.configuration).filter;
};
