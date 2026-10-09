export type PagePropertyType =
  | 'TITLE'
  | 'RICH_TEXT'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'PERSON'
  | 'DATE'
  | 'CHECKBOX'
  | 'NUMBER';

export const PAGE_PROPERTY_TYPE = {
  TITLE: 'TITLE',
  RICH_TEXT: 'RICH_TEXT',
  SELECT: 'SELECT',
  MULTI_SELECT: 'MULTI_SELECT',
  PERSON: 'PERSON',
  DATE: 'DATE',
  CHECKBOX: 'CHECKBOX',
  NUMBER: 'NUMBER',
} as const satisfies Record<PagePropertyType, PagePropertyType>;

export const PAGE_PROPERTY_TYPE_VALUES = [
  PAGE_PROPERTY_TYPE.TITLE,
  PAGE_PROPERTY_TYPE.RICH_TEXT,
  PAGE_PROPERTY_TYPE.SELECT,
  PAGE_PROPERTY_TYPE.MULTI_SELECT,
  PAGE_PROPERTY_TYPE.PERSON,
  PAGE_PROPERTY_TYPE.DATE,
  PAGE_PROPERTY_TYPE.CHECKBOX,
  PAGE_PROPERTY_TYPE.NUMBER,
] as const;

export type PageViewType = 'TABLE' | 'BOARD' | 'LIST' | 'GALLERY' | 'CALENDAR' | 'CHART';

export const PAGE_VIEW_TYPE = {
  TABLE: 'TABLE',
  BOARD: 'BOARD',
  LIST: 'LIST',
  GALLERY: 'GALLERY',
  CALENDAR: 'CALENDAR',
  CHART: 'CHART',
} as const satisfies Record<PageViewType, PageViewType>;

export const PAGE_VIEW_TYPE_VALUES = [
  PAGE_VIEW_TYPE.TABLE,
  PAGE_VIEW_TYPE.BOARD,
  PAGE_VIEW_TYPE.LIST,
  PAGE_VIEW_TYPE.GALLERY,
  PAGE_VIEW_TYPE.CALENDAR,
  PAGE_VIEW_TYPE.CHART,
] as const;

/** How rows arrive, not how they are drawn: a table and a gallery are both FLAT. */
export type PageViewShape = 'FLAT' | 'GROUPED';

export const PAGE_VIEW_SHAPE = {
  FLAT: 'FLAT',
  GROUPED: 'GROUPED',
} as const satisfies Record<PageViewShape, PageViewShape>;

export type PageViewGrouping = 'OPTIONAL' | 'REQUIRED' | 'UNSUPPORTED';

export const PAGE_VIEW_GROUPING = {
  OPTIONAL: 'OPTIONAL',
  REQUIRED: 'REQUIRED',
  UNSUPPORTED: 'UNSUPPORTED',
} as const satisfies Record<PageViewGrouping, PageViewGrouping>;

export type PageViewOutcomeKind = 'BANDED_ROWS' | 'FLAT_ROWS' | 'GROUPED_ROWS' | 'MISSING_GROUPING_PROPERTY';

export const PAGE_VIEW_OUTCOME_KIND = {
  /** Grid: one band per value of the second grouping, with the first grouping's columns inside. */
  BANDED_ROWS: 'BANDED_ROWS',
  FLAT_ROWS: 'FLAT_ROWS',
  GROUPED_ROWS: 'GROUPED_ROWS',
  MISSING_GROUPING_PROPERTY: 'MISSING_GROUPING_PROPERTY',
} as const satisfies Record<PageViewOutcomeKind, PageViewOutcomeKind>;
