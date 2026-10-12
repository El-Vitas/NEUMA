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

/** Select value for "no grouping": an empty value reads as nothing chosen, so it needs a key no property can have. */
export const PAGE_VIEW_NO_GROUP = '__none__';

export const PAGE_EDITOR_COLLECTION_REQUEST_SELECTOR = '[data-page-collection-request]';

export const PAGE_EDITOR_COLLECTION_VIEW_REQUEST_SELECTOR = '[data-page-collection-view-request]';
