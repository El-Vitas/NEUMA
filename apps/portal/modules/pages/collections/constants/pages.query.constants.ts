/** Rows a flat view asks for at first, and each time it is asked for more. */
export const PAGE_VIEW_FIRST_ROWS = 50;

/** Cards a board column asks for at first, and each time it is asked for more. */
export const PAGE_VIEW_FIRST_CARDS_PER_COLUMN = 25;

/** A calendar draws a month, so it reads the rows that start in its grid, up to this many. */
export const PAGE_VIEW_CALENDAR_ROWS = 100;

/** The most rows of a grid a calendar reads; beyond it the screen says that it shows only the first ones. */
export const PAGE_VIEW_CALENDAR_MAXIMUM_ROWS = 1000;

/** The most rows a timeline reads for its window; beyond it the screen says that it shows only the first ones. */
export const PAGE_VIEW_TIMELINE_MAXIMUM_ROWS = 2000;

/** The rows without a date a timeline lists apart; the count it shows is of all of them. */
export const PAGE_VIEW_TIMELINE_UNDATED_ROWS = 100;

/** The most rows "select all that match" can take (ADR 025: the ids a response carries). */
export const PAGE_VIEW_MATCHING_MAXIMUM_ROWS = 1000;

/** The rows a page of a continuation asks for: the most the server answers. */
export const PAGE_VIEW_CONTINUATION_ROWS = 100;

/** The pages a refreshed window of loaded rows is read in at most, so a very long scroll does not hold a request. */
export const PAGE_VIEW_REFRESH_MAXIMUM_ROWS = 1000;

/** The id of the reducer that reads rows, and of the one that counts them. */
export const PAGE_VIEW_ROWS_REDUCER = 'rows';

export const PAGE_VIEW_COUNTS_REDUCER = 'counts';

/** The item of the counts that is the number of rows; a calculation item is named after its property. */
export const PAGE_VIEW_COUNT_ITEM = 'count';

export const PAGE_VIEW_CALCULATION_ITEM_PREFIX = 'calculation:';
