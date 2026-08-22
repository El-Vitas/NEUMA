/**
 * How many of the pages pointing here are actually handed over.
 *
 * The heading says how many there are; the list shows the first of them. A page
 * everybody links to would otherwise answer with every one of those pages at
 * once, and nobody reads a list that long anyway.
 */
export const BACKLINKS_LIST_LIMIT = 100;

export const LINKS_OUTBOX_MAX_ATTEMPTS = 5;
export const LINKS_WORKER_IDLE_DELAY_MS = 1000;
