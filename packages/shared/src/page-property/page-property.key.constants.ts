/** A key starts with a letter, then letters, digits or underscores. */
export const PAGE_PROPERTY_KEY_COMBINING_MARKS = /[̀-ͯ]/g;
export const PAGE_PROPERTY_KEY_RUNS_OF_ANYTHING_ELSE = /[^a-z0-9]+/g;
export const PAGE_PROPERTY_KEY_EDGE_UNDERSCORES = /^_+|_+$/g;
export const PAGE_PROPERTY_KEY_STARTS_WITH_DIGIT = /^\d/;

export const PAGE_PROPERTY_KEY_FALLBACK = 'property';

export const PAGE_PROPERTY_KEY_DIGIT_PREFIX = 'p';

/** Server storage limit; a generated key fits it including prefix and numeric suffix. */
export const PAGE_PROPERTY_KEY_MAX_LENGTH = 64;

/** The row's name, which is the title of the page that row is. */
export const PAGE_COLLECTION_TITLE_PROPERTY_KEY = 'title';
