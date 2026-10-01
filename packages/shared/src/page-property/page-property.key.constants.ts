/** What a property key may hold, which is what the server accepts: a letter first, then letters, digits or underscores. */
export const PAGE_PROPERTY_KEY_COMBINING_MARKS = /[̀-ͯ]/g;
export const PAGE_PROPERTY_KEY_RUNS_OF_ANYTHING_ELSE = /[^a-z0-9]+/g;
export const PAGE_PROPERTY_KEY_EDGE_UNDERSCORES = /^_+|_+$/g;
export const PAGE_PROPERTY_KEY_STARTS_WITH_DIGIT = /^\d/;

/** What a key is called when what somebody typed left nothing usable behind. */
export const PAGE_PROPERTY_KEY_FALLBACK = 'property';

/** What goes in front of a key that would otherwise start with a digit. */
export const PAGE_PROPERTY_KEY_DIGIT_PREFIX = 'p';

export const PAGE_PROPERTY_KEY_MAX_LENGTH = 60;

/** What every row of a collection has: its name, which is the title of the page that row is. */
export const PAGE_COLLECTION_TITLE_PROPERTY_KEY = 'title';
