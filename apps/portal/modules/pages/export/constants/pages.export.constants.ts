export const PAGES_EXPORT_FILE_EXTENSION = '.md';
export const PAGES_EXPORT_ARCHIVE_EXTENSION = '.zip';
export const PAGES_EXPORT_FALLBACK_FILE_NAME = 'export';
export const PAGES_EXPORT_MAXIMUM_NAME_LENGTH = 80;

/** How many pages a selection may send at once, matching what the backend accepts. */
export const PAGES_EXPORT_SELECTION_LIMIT = 200;

/** What the backend answers with when what it sends is many pages packed together. */
export const PAGES_EXPORT_ARCHIVE_MEDIA_TYPE = 'application/zip';

/** What a file name keeps of a title: letters and digits, joined by single dashes. */
export const PAGES_EXPORT_COMBINING_MARKS = /[̀-ͯ]/g;
export const PAGES_EXPORT_RUNS_OF_ANYTHING_ELSE = /[^a-z0-9]+/g;
export const PAGES_EXPORT_EDGE_DASHES = /^-+|-+$/g;
export const PAGES_EXPORT_TRAILING_DASHES = /-+$/;
