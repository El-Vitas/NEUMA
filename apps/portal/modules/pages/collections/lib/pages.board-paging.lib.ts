import type { ColumnToRefresh, PagesBoardLoaded } from '../types/pages.board-paging.types';
import type { PageViewBand, PageViewGroup } from '../types/pages.schema.types';

const readDrawnIds = (band: PageViewBand): ReadonlySet<string> =>
  new Set(band.groups.flatMap((group) => group.rows.map((row) => row.id)));

/** A loaded card the server now draws, in this column or in another of its band, is not drawn twice. */
const addLoaded = (group: PageViewGroup, loaded: PagesBoardLoaded | undefined, drawn: ReadonlySet<string>) =>
  loaded === undefined || group.nextCursor === null
    ? group
    : {
        ...group,
        nextCursor: loaded.cursor,
        rows: [...group.rows, ...loaded.rows.filter((row) => !drawn.has(row.id))],
      };

/**
 * The bands with the cards each column loaded since appended after the ones the server drew. They stay when the server
 * draws the column differently: the reader is not folded back to the top. The window is read again to be exact.
 */
export const mergeLoadedCards = (
  bands: readonly PageViewBand[],
  loaded: Readonly<Record<string, PagesBoardLoaded>>,
  keyOf: (bandKey: string, groupKey: string) => string,
): readonly PageViewBand[] =>
  bands.map((band) => {
    const drawn = readDrawnIds(band);
    return {
      ...band,
      groups: band.groups.map((group) => addLoaded(group, loaded[keyOf(band.key, group.key)], drawn)),
    };
  });

/**
 * The columns the server drew again, with a different end, while holding loaded cards: what they loaded was read
 * after an end that is no longer theirs, so it is read again from the new one. A column drawn to its end holds none.
 */
export const listColumnsToRefresh = (
  bands: readonly PageViewBand[],
  loaded: Readonly<Record<string, PagesBoardLoaded>>,
  keyOf: (bandKey: string, groupKey: string) => string,
): readonly ColumnToRefresh[] =>
  bands.flatMap((band) =>
    band.groups.flatMap((group) => {
      const held = loaded[keyOf(band.key, group.key)];
      const end = group.nextCursor ?? null;
      const isStale =
        held !== undefined && held.rows.length > 0 && held.drawnCursor !== end && held.refreshFrom !== end;
      return isStale && end !== null ? [{ bandKey: band.key, drawnCursor: end, groupKey: group.key }] : [];
    }),
  );
