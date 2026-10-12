import type { PageViewGrouping, PageViewShape, PageViewType } from '../types/page-schema.types.js';
import { PAGE_VIEW_GROUPING, PAGE_VIEW_SHAPE, PAGE_VIEW_TYPE } from '../types/page-schema.types.js';

/** How rows arrive and how grouping applies, not how the view is drawn; a new view type needs one entry. */
export interface PageViewDefinition {
  readonly grouping: PageViewGrouping;
  readonly shape: PageViewShape;
  readonly type: PageViewType;
}

/** `shape` is the default; a table asked to group reads in groups, so the effective shape depends on settings. */
const tableDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.OPTIONAL,
  shape: PAGE_VIEW_SHAPE.FLAT,
  type: PAGE_VIEW_TYPE.TABLE,
};

const boardDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.REQUIRED,
  shape: PAGE_VIEW_SHAPE.GROUPED,
  type: PAGE_VIEW_TYPE.BOARD,
};

const listDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.OPTIONAL,
  shape: PAGE_VIEW_SHAPE.FLAT,
  type: PAGE_VIEW_TYPE.LIST,
};

const galleryDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.OPTIONAL,
  shape: PAGE_VIEW_SHAPE.FLAT,
  type: PAGE_VIEW_TYPE.GALLERY,
};

/** Does not group: its buckets are the days of the month, placed by each row's date. */
const calendarDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.UNSUPPORTED,
  shape: PAGE_VIEW_SHAPE.FLAT,
  type: PAGE_VIEW_TYPE.CALENDAR,
};

/** A drawn grouping: it draws counts per group, so the grouping property is its axis. */
const chartDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.REQUIRED,
  shape: PAGE_VIEW_SHAPE.GROUPED,
  type: PAGE_VIEW_TYPE.CHART,
};

export const PAGE_VIEW_DEFINITIONS = {
  [PAGE_VIEW_TYPE.TABLE]: tableDefinition,
  [PAGE_VIEW_TYPE.BOARD]: boardDefinition,
  [PAGE_VIEW_TYPE.LIST]: listDefinition,
  [PAGE_VIEW_TYPE.GALLERY]: galleryDefinition,
  [PAGE_VIEW_TYPE.CALENDAR]: calendarDefinition,
  [PAGE_VIEW_TYPE.CHART]: chartDefinition,
} as const satisfies Record<PageViewType, PageViewDefinition>;
