import type { BlockViewer } from '@neuma/shared';
import { canReadCandidate } from './search.access.domain';
import type { ReadableSlice, SearchCandidate, SearchGranularity } from './search.domain.types';

/** The first match of each page, in the order given: a page's matches come together, best first. */
const pickPageMatches = (rows: readonly SearchCandidate[], viewer: BlockViewer): SearchCandidate[] => {
  const chosen = new Map<string, SearchCandidate>();
  for (const row of rows) {
    if (!chosen.has(row.pageId) && canReadCandidate(viewer, row.pageChain) && canReadCandidate(viewer, row.chain)) {
      chosen.set(row.pageId, row);
    }
  }
  return [...chosen.values()];
};

/**
 * What the viewer may see among the rows. A block needs every rule above it to let them read. A page needs the same
 * of its own rules and of at least one match under it, which then stands for the page; a match the viewer cannot
 * read never shows the page.
 */
export const takeReadable = (
  rows: readonly SearchCandidate[],
  viewer: BlockViewer,
  room: number,
  granularity: SearchGranularity,
): ReadableSlice => {
  const readable =
    granularity === 'page' ? pickPageMatches(rows, viewer) : rows.filter((row) => canReadCandidate(viewer, row.chain));
  return { hasSurplus: readable.length > room, taken: readable.slice(0, room) };
};

/** Results the statement returned: a page counts once however many of its matches came with it. */
export const countResults = (rows: readonly SearchCandidate[], granularity: SearchGranularity): number =>
  granularity === 'page' ? new Set(rows.map((row) => row.pageId)).size : rows.length;

/** A full batch says rows may exist past the ones fetched; a short one says they are all here. */
export const mayHaveMoreRows = (
  rows: readonly SearchCandidate[],
  fetchSize: number,
  granularity: SearchGranularity,
): boolean => countResults(rows, granularity) >= fetchSize;
