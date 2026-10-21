/** Key only: the label shown on screen is translated. */
export const PAGE_COLLECTION_FIRST_PROPERTY_KEY = 'notes';

export const PAGE_TABLE_DEFAULT_COLUMN_WIDTH = 180;

export const PAGE_TABLE_TITLE_COLUMN_WIDTH = 280;

export const PAGE_TABLE_COLUMN_WIDTH_STEP = 20;

export const PAGE_TABLE_MINIMUM_COLUMN_WIDTH = 80;

export const PAGE_TABLE_MAXIMUM_COLUMN_WIDTH = 960;

/** Opaque background so scrolled cells do not show through the frozen one. */
export const PAGE_TABLE_FROZEN_CELL_CLASS = 'sticky z-10 bg-surface';

/** Kept in the URL so a view can be shared by link and survives a reload. */
export const PAGE_COLLECTION_VIEW_SEARCH_PARAM = 'view';

/** The words typed to find rows travel in the URL too: the server reads the rows, so it needs them to read them. */
export const PAGE_COLLECTION_ROW_SEARCH_PARAM = 'q';

/** The quick filter (not saved in the view) travels in the URL as JSON, for the same reason as the words. */
export const PAGE_COLLECTION_QUICK_FILTER_SEARCH_PARAM = 'filter';

/** Longer than this is not something the filter editor wrote. */
export const PAGE_COLLECTION_QUICK_FILTER_MAXIMUM_LENGTH = 4000;

/** A view read as it was saved: no words searched, no quick filter and no month asked for. */
export const UNSEARCHED_ROWS_REQUEST = { month: null, quickFilter: null, search: '' } as const;

/** The month a calendar shows, as `YYYY-MM`: the server reads the rows of its grid, so it must be told which. */
export const PAGE_COLLECTION_MONTH_SEARCH_PARAM = 'month';

/** Select value for "no grouping": an empty value reads as nothing chosen, so it needs a key no property can have. */
export const PAGE_VIEW_NO_GROUP = '__none__';

export const PAGE_EDITOR_COLLECTION_REQUEST_SELECTOR = '[data-page-collection-request]';

export const PAGE_EDITOR_COLLECTION_VIEW_REQUEST_SELECTOR = '[data-page-collection-view-request]';
