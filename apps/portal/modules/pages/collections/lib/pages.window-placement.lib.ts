import type { PageFilter } from '@neuma/shared';
import { matchesPageFilter, PAGE_PROPERTY_TYPE, resolvePageFilter } from '@neuma/shared';
import { BOARD_PLACEMENT_SERVER_ONLY_PROPERTY_TYPES } from '../constants/pages.board-placement.constants';
import type { PagePropertyValues, PageRow } from '../types/pages.schema.types';
import type {
  WindowPlacement,
  WindowPlacementContext,
  WindowPlacementInput,
  WindowRequeryReason,
} from '../types/pages.window-placement.types';
import { listFilterPropertyKeys, namesViewer } from './pages.filter-keys.lib';
import { toViewProperties } from './pages.view-properties.lib';

const listReadFilters = (context: WindowPlacementContext): readonly (null | PageFilter)[] => [
  context.filter,
  context.undatedFilter,
  ...context.windowFilters,
];

const findUndecidableReason = (context: WindowPlacementContext): WindowRequeryReason | null => {
  if (context.hasSearch) return 'search';
  const filters = listReadFilters(context);
  if (context.viewerId === null && filters.some(namesViewer)) return 'viewer-marker';
  const isServerOnly = filters.flatMap(listFilterPropertyKeys).some((key) => {
    const type = context.properties.find((property) => property.key === key)?.type;
    return type !== undefined && BOARD_PLACEMENT_SERVER_ONLY_PROPERTY_TYPES.includes(type);
  });
  return isServerOnly ? 'server-only-property' : null;
};

const valuesOf = (row: PageRow, context: WindowPlacementContext): PagePropertyValues => {
  const titleKey = context.properties.find((property) => property.type === PAGE_PROPERTY_TYPE.TITLE)?.key;
  return titleKey === undefined ? (row.propertyValues ?? {}) : { ...row.propertyValues, [titleKey]: row.title };
};

const createMatcher =
  (context: WindowPlacementContext) =>
  (filter: null | PageFilter, row: PageRow): boolean => {
    if (filter === null) return true;
    const properties = toViewProperties(context.properties);
    const resolved = resolvePageFilter(filter, properties, {
      now: context.now,
      timeZone: context.timeZone,
      viewerId: context.viewerId ?? '',
    });
    return matchesPageFilter(resolved, valuesOf(row, context), properties, { timeZone: context.timeZone });
  };

const without = (rows: readonly PageRow[], ids: ReadonlySet<string>): readonly PageRow[] =>
  rows.filter((row) => !ids.has(row.id));

const replaceOrAppend = (rows: readonly PageRow[], row: PageRow): readonly PageRow[] =>
  rows.some((held) => held.id === row.id) ? rows.map((held) => (held.id === row.id ? row : held)) : [...rows, row];

/**
 * Where the rows that others changed go on a screen of days (a calendar, a timeline), decided in the browser with the
 * engine the server is tested against. What it cannot tell, it says why, and the server is asked again.
 */
export const placeChangedWindowRows = (input: WindowPlacementInput): WindowPlacement => {
  const { changedRows, context, trashedIds } = input;
  const undecidable = findUndecidableReason(context);
  if (undecidable !== null) return { kind: 'requery', reason: undecidable };
  const matches = createMatcher(context);
  const heldIds = new Set(input.rows.map((row) => row.id));
  const undatedHeldIds = new Set(input.undatedRows.map((row) => row.id));
  let rows = without(input.rows, new Set(trashedIds));
  let undatedRows = without(input.undatedRows, new Set(trashedIds));
  for (const row of changedRows) {
    const isViewed = matches(context.filter, row);
    const isInWindow = isViewed && context.windowFilters.some((filter) => matches(filter, row));
    const isUndated = isViewed && context.undatedFilter !== null && matches(context.undatedFilter, row);
    if (isInWindow && !heldIds.has(row.id) && context.isTruncated)
      return { kind: 'requery', reason: 'window-truncated' };
    if (isUndated && !undatedHeldIds.has(row.id) && undatedRows.length < context.undatedTotal) {
      return { kind: 'requery', reason: 'undated-truncated' };
    }
    rows = isInWindow ? replaceOrAppend(rows, row) : without(rows, new Set([row.id]));
    undatedRows = isUndated ? replaceOrAppend(undatedRows, row) : without(undatedRows, new Set([row.id]));
  }
  const hasChanged =
    trashedIds.some((id) => heldIds.has(id) || undatedHeldIds.has(id)) ||
    rows.length !== input.rows.length ||
    undatedRows.length !== input.undatedRows.length ||
    rows.some((row, position) => row !== input.rows[position]) ||
    undatedRows.some((row, position) => row !== input.undatedRows[position]);
  return { hasChanged, kind: 'placed', rows, undatedRows };
};
