export const COMMENT_REPOSITORY = 'COMMENT_REPOSITORY';

/** What a comment shows as its author when the account is gone. */
export const UNKNOWN_AUTHOR_NAME = '';

/** What a request may carry as a quote; the domain then keeps the first characters a discussion stores. */
export const COMMENT_QUOTE_REQUEST_MAX_LENGTH = 5000;

/** How many levels below a page are followed when looking for the blocks it shows; the blocks module allows 64. */
export const COMMENT_PAGE_TREE_DEPTH_MAX = 64;

/** Discussions read per round are this many times the page size, so a few hidden ones do not cost another round. */
export const COMMENT_SCAN_FACTOR = 3;

/** A page of nothing but hidden discussions is skipped in at most this many rounds. */
export const COMMENT_BATCH_ROUNDS_MAX = 20;
