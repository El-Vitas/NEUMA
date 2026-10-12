export const SEARCH_TRIGRAM_THRESHOLD = 0.18;

/** pg_trgm thresholds read by the `%` and `<<%` operators, the ones the trigram index can serve. */
export const SEARCH_SIMILARITY_SETTING = 'pg_trgm.similarity_threshold';
export const SEARCH_STRICT_WORD_SIMILARITY_SETTING = 'pg_trgm.strict_word_similarity_threshold';

/**
 * Minimum similarity to a whole word of the block to count as a typo. Measured on real blocks:
 * unrelated words score 0.33 or less, a one-letter slip scores 0.62 to 0.67. Trade-off: two
 * transposed letters also score 0.33, so such typos are not found.
 */
export const PAGE_BLOCK_WORD_SIMILARITY_THRESHOLD = 0.45;
/** Shorter queries are not matched inside other words, since they occur in almost everything. */
export const SEARCH_INSIDE_WORD_MIN_LENGTH = 3;

/** Characters `ILIKE` treats as wildcards or escape; in a query they are literal. */
export const SEARCH_LIKE_SPECIAL_SIGNS = /[\\%_]/g;

/** Rank tiers: whole word first (by similarity), then inside a title word, then inside a text word. */
export const SEARCH_WHOLE_WORD_RANK = 1;
export const SEARCH_INSIDE_TITLE_RANK = 0.5;
export const SEARCH_INSIDE_TEXT_RANK = 0.25;

/** Keeps Postgres rank within 0 to 1 so it never crosses the tiers above. */
export const SEARCH_TEXT_RANK_NORMALIZATION = 32;

export const SEARCH_OUTBOX_MAX_ATTEMPTS = 5;
export const SEARCH_WORKER_IDLE_DELAY_MS = 1000;

/** Largest int4. Marks a deleted page for removal; a larger value would fail the query. */
export const SEARCH_MAX_VERSION_MARKER = 2_147_483_647;
