import type { PageViewGrouping, PageViewShape, PageViewType } from '../types/page-schema.types.js';
import { PAGE_VIEW_GROUPING, PAGE_VIEW_SHAPE, PAGE_VIEW_TYPE } from '../types/page-schema.types.js';

/**
 * What one kind of view is, as everything else needs to know it.
 *
 * A view says how its rows arrive and what it does with grouping, and nothing
 * about how it is drawn. Whoever draws it looks itself up by type. That is what
 * lets a new kind of view enter by adding one entry here instead of by touching
 * the code that reads the rows.
 */
export interface PageViewDefinition {
  readonly grouping: PageViewGrouping;
  readonly shape: PageViewShape;
  readonly type: PageViewType;
}

const tableDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.UNSUPPORTED,
  shape: PAGE_VIEW_SHAPE.FLAT,
  type: PAGE_VIEW_TYPE.TABLE,
};

const boardDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.REQUIRED,
  shape: PAGE_VIEW_SHAPE.GROUPED,
  type: PAGE_VIEW_TYPE.BOARD,
};

export const PAGE_VIEW_DEFINITIONS = {
  [PAGE_VIEW_TYPE.TABLE]: tableDefinition,
  [PAGE_VIEW_TYPE.BOARD]: boardDefinition,
} as const satisfies Record<PageViewType, PageViewDefinition>;
