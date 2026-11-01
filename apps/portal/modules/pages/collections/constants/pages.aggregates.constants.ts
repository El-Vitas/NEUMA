import type { PageViewAggregates } from '../types/pages.schema.types';

/** What a screen reads when it has nothing to count yet: the counts are null, never a made-up zero. */
export const NO_PAGE_AGGREGATES: Promise<null> = Promise.resolve(null);

export const EMPTY_PAGE_VIEW_AGGREGATES: PageViewAggregates = {
  calculations: {},
  distinctRowCount: 0,
  groupCalculations: {},
  groupCounts: {},
};

/** Joins the keys of a list when it is compared as a whole; a character no key holds. */
export const PAGE_KEY_SEPARATOR = '\u0000';
