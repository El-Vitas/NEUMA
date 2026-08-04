export const SEARCH_CACHE_TAG = 'portal-search';
export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 50;
export const SEARCH_MAX_QUERY_LENGTH = 200;
export const SEARCH_MAX_CONTENT_TYPE_LENGTH = 64;
export const SEARCH_MAX_SPACE_ID_LENGTH = 128;
export const SEARCH_MAX_TAG_LENGTH = 64;
export const SEARCH_MAX_TAGS = 20;
export const SEARCH_MAX_CURSOR_LENGTH = 512;
export const SEARCH_SOURCE_TYPES = ['PAGE', 'DATABASE_RECORD'] as const;

export const SEARCH_RESULT_DATE_FORMATTER_EN: Intl.DateTimeFormat = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
});
export const SEARCH_RESULT_DATE_FORMATTER_ES: Intl.DateTimeFormat = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
});
