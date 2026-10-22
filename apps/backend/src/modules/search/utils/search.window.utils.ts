import {
  SEARCH_MAX_WINDOW,
  SEARCH_WINDOW_FACTOR,
  SEARCH_WINDOW_GROWTH,
  SEARCH_WINDOW_ROOM,
} from '../constants/search.constants';

/** How many of the best matches a statement looks at when it has to produce `fetchSize` results. */
export const toInitialWindowSize = (fetchSize: number): number => fetchSize * SEARCH_WINDOW_FACTOR;

/**
 * The next window when `found` of the `wanted` results survived out of `windowSize` matches: large enough, at the
 * rate they survived, to hold what is missing with some room; a window that lost nearly everything jumps to the end.
 */
export const toWiderWindowSize = (windowSize: number, found: number, wanted: number): number => {
  const byRate = Math.ceil((wanted / Math.max(found, 1)) * windowSize * SEARCH_WINDOW_ROOM);
  return Math.min(Math.max(windowSize * SEARCH_WINDOW_GROWTH, byRate), SEARCH_MAX_WINDOW);
};
