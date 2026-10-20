/** Shorter queries are not matched inside other words, since they occur in almost everything. */
export const SEARCH_INSIDE_WORD_MIN_LENGTH = 3;

/** Characters `ILIKE` treats as wildcards or escape; in a query they are literal. */
export const SEARCH_LIKE_SPECIAL_SIGNS = /[\\%_]/g;

/** Rank tiers: whole word first (by rank), then inside a word. A page title outranks the body at the same tier. */
export const SEARCH_WHOLE_WORD_RANK = 1;
export const SEARCH_INSIDE_WORD_RANK = 0.25;
export const SEARCH_TITLE_RANK_BONUS = 0.5;

/** Keeps Postgres rank within 0 to 1 so it never crosses the tiers above. */
export const SEARCH_TEXT_RANK_NORMALIZATION = 32;

/**
 * Minimum similarity to a whole word of the block to count as a typo. Measured on real blocks:
 * unrelated words score 0.33 or less, a one-letter slip scores 0.62 to 0.67. Trade-off: two
 * transposed letters also score 0.33, so such typos are not found.
 */
export const SEARCH_TYPO_WORD_SIMILARITY_THRESHOLD = 0.45;

/** The pg_trgm threshold read by the `<<%` operator, the one the trigram index can serve. */
export const SEARCH_STRICT_WORD_SIMILARITY_SETTING = 'pg_trgm.strict_word_similarity_threshold';

/** Rows fetched per round, as a multiple of the page size, so blocks hidden by permissions do not shrink a page. */
export const SEARCH_OVERFETCH_FACTOR = 2;

/** Rounds a page may take when many fetched rows turn out to be unreadable. */
export const SEARCH_MAX_ROUNDS = 4;

/** Stops a corrupt parent cycle from recursing forever in the ancestor chain. */
export const SEARCH_ANCESTOR_DEPTH_LIMIT = 64;

export const SEARCH_HEADING_BLOCK_TYPE = 'heading';

/** Every result is a page; the field stays for clients that filter on it. */
export const SEARCH_RESULT_CONTENT_TYPE = 'PAGE';

export const SEARCH_SNIPPET_OPTIONS = 'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=30,MinWords=8';
