import { PAGE_VIEW_TYPE, readPageViewConfiguration } from '@neuma/shared';
import type { LocalCache } from '../../local-cache/types/local-cache.types';
import type {
  CachedPaint,
  CachedPaintChanges,
  CachedPaintChangesInput,
  CachedWindowChanges,
  CachedWindowRows,
} from '../types/pages.cached-paint.types';
import type { PageCollectionChanges } from '../types/pages.query.types';
import type { PageTimelineReading } from '../types/pages.schema.types';
import type { CachedRowBody } from '../types/pages.view-cache.types';
import { placeChangedBoardRows } from './pages.board-placement.lib';
import { buildCalendarUndatedFilter, readCalendarWindowFilters } from './pages.calendar.lib';
import { readTimelineLiveSeed } from './pages.timeline.lib';
import { readCachedViewLayout } from './pages.view-cache.lib';
import { andQuickFilters } from './pages.view-query.lib';
import { placeChangedWindowRows } from './pages.window-placement.lib';

/** Forgets every row of a collection the cache holds, and the views drawn from them: what is no longer readable. */
export const purgeCollectionRows = async (cache: LocalCache<CachedRowBody>, collectionId: string): Promise<void> => {
  const held = cache.listRecords().filter((body) => body.row.parentId === collectionId);
  await cache.purgeRecords(held.map((body) => body.id));
};

/** What the cache holds for a question, or null when it holds nothing a view could be drawn from. */
export const readCachedPaint = (cache: LocalCache<CachedRowBody>, key: string): CachedPaint | null => {
  const reading = cache.readResult(key);
  if (reading === null) return null;
  const read = readCachedViewLayout(reading.result.layout, new Map(reading.records.map((body) => [body.id, body.row])));
  return read === null ? null : { changesCursor: reading.result.changesCursor, ids: reading.result.ids, key, read };
};

const toRowBodies = (changes: PageCollectionChanges): CachedPaintChanges['bodies'] =>
  [...changes.possiblyChanged, ...changes.rows].map((row) => ({
    id: row.id,
    row,
    spaceId: row.spaceId,
    version: row.version,
  }));

/**
 * What a painted copy looks like with the changes since placed in it, by the engine of the server. Null when the
 * browser cannot tell, or when a place depends on an order only the server knows: the server's answer replaces it.
 */
export const placeCachedChanges = ({
  changes,
  hasSearch,
  paint,
  quickFilter,
}: CachedPaintChangesInput): CachedPaintChanges | null => {
  if (changes.isReset || paint.read.bands.length === 0) return null;
  const configuration = readPageViewConfiguration(paint.read.view.configuration);
  const placement = placeChangedBoardRows({
    bands: paint.read.bands,
    changedRows: [...changes.possiblyChanged, ...changes.rows],
    context: {
      filter: quickFilter === null ? configuration.filter : andQuickFilters(configuration.filter, quickFilter),
      groupByKey: configuration.groupBy ?? '',
      groupByMode: configuration.groupByMode,
      hasSearch,
      hiddenGroups: configuration.hiddenGroups,
      now: Date.now(),
      properties: paint.read.schema.properties,
      sorts: configuration.sorts,
      subGroupByKey: configuration.subGroupBy ?? '',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      viewerId: paint.read.viewerId,
    },
    trashedIds: changes.trashedIds,
  });
  if (placement.kind === 'requery' || placement.refreshColumns.length > 0) return null;
  return { bands: placement.bands, bodies: toRowBodies(changes), cursor: changes.cursor };
};

/** A timeline as it was kept, with the rows that have no start as the changes since left them. */
export const toPlacedTimeline = (
  timeline: null | PageTimelineReading,
  window: CachedWindowRows | null,
): PageTimelineReading | undefined => {
  if (timeline === null) return undefined;
  return window === null ? timeline : { ...timeline, undated: window.undated, undatedRows: window.undatedRows };
};

/** What the server read to draw a screen of days, as the filters the placement needs; null when it cannot be told. */
const readWindowSeed = (paint: CachedPaint, dateProperty: string, endDateProperty: null | string) => {
  const { calendar, timeline, view } = paint.read;
  if (view.type === PAGE_VIEW_TYPE.CALENDAR && calendar !== null) {
    return {
      isTruncated: calendar.isTruncated,
      listsUndated: false,
      undated: calendar.undated,
      undatedRows: [],
      windowFilters: readCalendarWindowFilters(dateProperty, calendar.scale, calendar.day, calendar.month),
    };
  }
  if (view.type === PAGE_VIEW_TYPE.TIMELINE && timeline !== null) {
    return { ...readTimelineLiveSeed(timeline, dateProperty, endDateProperty), listsUndated: true };
  }
  return null;
};

/**
 * What a painted calendar or timeline looks like with the changes since placed in it, by the engine of the server.
 * Null when the browser cannot tell, and then the server's answer replaces the copy.
 */
export const placeCachedWindowChanges = ({
  changes,
  hasSearch,
  paint,
  quickFilter,
}: CachedPaintChangesInput): CachedWindowChanges | null => {
  const configuration = readPageViewConfiguration(paint.read.view.configuration);
  if (changes.isReset || configuration.dateProperty === null) return null;
  const seed = readWindowSeed(paint, configuration.dateProperty, configuration.endDateProperty);
  if (seed === null) return null;
  const placement = placeChangedWindowRows({
    changedRows: [...changes.possiblyChanged, ...changes.rows],
    context: {
      filter: quickFilter === null ? configuration.filter : andQuickFilters(configuration.filter, quickFilter),
      hasSearch,
      isTruncated: seed.isTruncated,
      now: Date.now(),
      properties: paint.read.schema.properties,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      undatedFilter: seed.listsUndated ? buildCalendarUndatedFilter(configuration.dateProperty) : null,
      undatedTotal: seed.undated,
      viewerId: paint.read.viewerId,
      windowFilters: seed.windowFilters,
    },
    rows: paint.read.windowRows,
    trashedIds: changes.trashedIds,
    undatedRows: seed.undatedRows,
  });
  if (placement.kind === 'requery') return null;
  return {
    bodies: toRowBodies(changes),
    cursor: changes.cursor,
    hasChanged: placement.hasChanged,
    rows: placement.rows,
    undatedRows: placement.undatedRows,
  };
};
