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

export type PageViewType = 'TABLE' | 'BOARD';

export const PAGE_VIEW_TYPE = {
  TABLE: 'TABLE',
  BOARD: 'BOARD',
} as const satisfies Record<PageViewType, PageViewType>;

export const PAGE_VIEW_TYPE_VALUES = [PAGE_VIEW_TYPE.TABLE, PAGE_VIEW_TYPE.BOARD] as const;

/**
 * How the rows of a view arrive: one after another, or already gathered in
 * groups. It says nothing about how they are drawn — a table and a gallery
 * both read their rows in a row and look nothing alike.
 */
export type PageViewShape = 'FLAT' | 'GROUPED';

export const PAGE_VIEW_SHAPE = {
  FLAT: 'FLAT',
  GROUPED: 'GROUPED',
} as const satisfies Record<PageViewShape, PageViewShape>;

/** Whether a view can be asked to group, must be, or has no use for it. */
export type PageViewGrouping = 'OPTIONAL' | 'REQUIRED' | 'UNSUPPORTED';

export const PAGE_VIEW_GROUPING = {
  OPTIONAL: 'OPTIONAL',
  REQUIRED: 'REQUIRED',
  UNSUPPORTED: 'UNSUPPORTED',
} as const satisfies Record<PageViewGrouping, PageViewGrouping>;

export type PageViewOutcomeKind = 'FLAT_ROWS' | 'GROUPED_ROWS' | 'MISSING_GROUPING_PROPERTY';

export const PAGE_VIEW_OUTCOME_KIND = {
  FLAT_ROWS: 'FLAT_ROWS',
  GROUPED_ROWS: 'GROUPED_ROWS',
  MISSING_GROUPING_PROPERTY: 'MISSING_GROUPING_PROPERTY',
} as const satisfies Record<PageViewOutcomeKind, PageViewOutcomeKind>;
