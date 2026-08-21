export const PAGES_EXPORT_FILE_EXTENSION = '.md';
export const PAGES_EXPORT_FALLBACK_FILE_NAME = 'export';
export const PAGES_EXPORT_MAXIMUM_NAME_LENGTH = 80;
export const PAGES_EXPORT_MEDIA_TYPE = 'text/markdown;charset=utf-8';

/** What a file name keeps of a title: letters and digits, joined by single dashes. */
export const PAGES_EXPORT_COMBINING_MARKS = /[̀-ͯ]/g;
export const PAGES_EXPORT_RUNS_OF_ANYTHING_ELSE = /[^a-z0-9]+/g;
export const PAGES_EXPORT_EDGE_DASHES = /^-+|-+$/g;
export const PAGES_EXPORT_TRAILING_DASHES = /-+$/;
