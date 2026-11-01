/** How other modules ask for a search without reaching into the search module (see `SearchReader`). */
export const SEARCH_READER = Symbol('SEARCH_READER');
export const SEARCH_SOURCE_TYPE_VALUES = ['PAGE'] as const;
export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 50;
export const SEARCH_MAX_QUERY_LENGTH = 200;
export const SEARCH_MAX_CONTENT_TYPE_LENGTH = 64;
export const SEARCH_MAX_CURSOR_LENGTH = 512;
export const SEARCH_EDITED_RANGE_VALUES = ['TODAY', 'LAST_SEVEN_DAYS', 'LAST_MONTH', 'THIS_YEAR'] as const;
export const SEARCH_MAX_AUTHOR_QUERY_LENGTH = 128;
