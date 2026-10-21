import type { PageFilter, PageViewProperty } from '@neuma/shared';
import {
  comparePageRowsBySorts,
  matchesPageFilter,
  PAGE_FILTER_ME,
  PAGE_GROUP_BY_MODE,
  PAGE_PROPERTY_TYPE,
  Result,
  resolvePageFilter,
  UNASSIGNED_GROUP_KEY,
} from '@neuma/shared';
import { BOARD_PLACEMENT_SERVER_ONLY_PROPERTY_TYPES } from '../constants/pages.board-placement.constants';
import type {
  BoardColumn,
  BoardColumnAddress,
  BoardPlacement,
  BoardPlacementContext,
  BoardPlacementInput,
  BoardPlacementProgress,
  BoardRequeryReason,
} from '../types/pages.board-placement.types';
import type { PagePropertyValues, PageRow, PageSchemaProperty, PageViewBand } from '../types/pages.schema.types';

const addressKey = (address: BoardColumnAddress): string => `${address.bandKey}|${address.groupKey}`;

const toViewProperty = (property: PageSchemaProperty): PageViewProperty => ({
  key: property.key,
  options: property.options,
  type: property.type,
});

const listFilterKeys = (filter: null | PageFilter): readonly string[] => {
  if (filter === null) return [];
  return filter.kind === 'CONDITION' ? [filter.propertyKey] : filter.conditions.flatMap(listFilterKeys);
};

const namesViewer = (filter: null | PageFilter): boolean => {
  if (filter === null) return false;
  if (filter.kind === 'GROUP') return filter.conditions.some(namesViewer);
  const { value } = filter;
  return value === PAGE_FILTER_ME || (Array.isArray(value) && value.includes(PAGE_FILTER_ME));
};

/** The filter with its markers replaced for the reader; the same step the server takes before it compiles. */
const resolveContext = (context: BoardPlacementContext): BoardPlacementContext =>
  context.filter === null
    ? context
    : {
        ...context,
        filter: resolvePageFilter(context.filter, context.properties.map(toViewProperty), {
          now: context.now,
          timeZone: context.timeZone,
          viewerId: context.viewerId ?? '',
        }),
      };

const findUndecidableReason = (context: BoardPlacementContext): BoardRequeryReason | null => {
  if (context.hasSearch) return 'search';
  if (context.viewerId === null && namesViewer(context.filter)) return 'viewer-marker';
  const keys = [
    ...listFilterKeys(context.filter),
    ...context.sorts.map((sort) => sort.propertyKey),
    context.groupByKey,
    context.subGroupByKey,
  ];
  const isServerOnly = keys.some((key) => {
    const type = context.properties.find((property) => property.key === key)?.type;
    return type !== undefined && BOARD_PLACEMENT_SERVER_ONLY_PROPERTY_TYPES.includes(type);
  });
  return isServerOnly ? 'server-only-property' : null;
};

const valuesOf = (row: PageRow, context: BoardPlacementContext): PagePropertyValues => {
  const titleKey = context.properties.find((property) => property.type === PAGE_PROPERTY_TYPE.TITLE)?.key;
  return titleKey === undefined ? (row.propertyValues ?? {}) : { ...row.propertyValues, [titleKey]: row.title };
};

const passesFilter = (row: PageRow, context: BoardPlacementContext): boolean =>
  context.filter === null ||
  matchesPageFilter(context.filter, valuesOf(row, context), context.properties.map(toViewProperty), {
    timeZone: context.timeZone,
  });

const compareRows = (left: PageRow, right: PageRow, context: BoardPlacementContext): number =>
  comparePageRowsBySorts(
    context.sorts,
    valuesOf(left, context),
    valuesOf(right, context),
    context.properties.map(toViewProperty),
  ) || left.id.localeCompare(right.id);

const toStringList = (value: unknown): readonly string[] | null => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) return value;
  return null;
};

const readStatusKeys = (property: PageSchemaProperty, value: unknown, mode: string): readonly string[] | null => {
  if (typeof value !== 'string') return null;
  if (mode !== PAGE_GROUP_BY_MODE.GROUP) return [value];
  const group = property.options?.find((option) => option.id === value)?.group ?? null;
  return group === null ? null : [group];
};

const readListKeys = (value: unknown): readonly string[] | null => {
  if (value === undefined || value === null) return [UNASSIGNED_GROUP_KEY];
  const list = toStringList(value);
  if (list === null) return null;
  return list.length === 0 ? [UNASSIGNED_GROUP_KEY] : list;
};

/** The columns a value puts a card in, or null when the browser does not know how this kind of value is grouped. */
const readAxisKeys = (
  row: PageRow,
  key: string,
  mode: string,
  properties: readonly PageSchemaProperty[],
): readonly string[] | null => {
  const property = properties.find((candidate) => candidate.key === key);
  if (property === undefined) return null;
  const value = row.propertyValues?.[key];
  switch (property.type) {
    case PAGE_PROPERTY_TYPE.SELECT:
      return typeof value === 'string' ? [value] : [UNASSIGNED_GROUP_KEY];
    case PAGE_PROPERTY_TYPE.STATUS:
      return readStatusKeys(property, value, mode);
    case PAGE_PROPERTY_TYPE.MULTI_SELECT:
    case PAGE_PROPERTY_TYPE.PERSON:
      return readListKeys(value);
    case PAGE_PROPERTY_TYPE.CHECKBOX:
      return [value === true ? 'true' : 'false'];
    default:
      return null;
  }
};

const isAxisUnchanged = (previous: PageRow, next: PageRow, key: string): boolean =>
  JSON.stringify(previous.propertyValues?.[key] ?? null) === JSON.stringify(next.propertyValues?.[key] ?? null);

const listColumns = (bands: readonly PageViewBand[]): readonly BoardColumn[] =>
  bands.flatMap((band) =>
    band.groups.map((group) => ({
      address: { bandKey: band.key, groupKey: group.key },
      nextCursor: group.nextCursor ?? null,
      rows: group.rows,
    })),
  );

const findColumn = (bands: readonly PageViewBand[], address: BoardColumnAddress): BoardColumn | undefined =>
  listColumns(bands).find((candidate) => addressKey(candidate.address) === addressKey(address));

const listHeldAddresses = (bands: readonly PageViewBand[], rowId: string): readonly BoardColumnAddress[] =>
  listColumns(bands)
    .filter((column) => column.rows.some((row) => row.id === rowId))
    .map((column) => column.address);

const toDesiredAddresses = (
  row: PageRow,
  previous: PageRow | undefined,
  bands: readonly PageViewBand[],
  context: BoardPlacementContext,
): Result<readonly BoardColumnAddress[], BoardRequeryReason> => {
  const isBanded = context.subGroupByKey !== '';
  const isUnchanged =
    previous !== undefined &&
    isAxisUnchanged(previous, row, context.groupByKey) &&
    (!isBanded || isAxisUnchanged(previous, row, context.subGroupByKey));
  if (isUnchanged) return Result.ok(listHeldAddresses(bands, row.id));
  const groupKeys = readAxisKeys(row, context.groupByKey, context.groupByMode, context.properties);
  const bandKeys = isBanded
    ? readAxisKeys(row, context.subGroupByKey, PAGE_GROUP_BY_MODE.OPTION, context.properties)
    : [''];
  if (groupKeys === null || bandKeys === null) return Result.fail('unsupported-grouping');
  return Result.ok(
    bandKeys.flatMap((bandKey) =>
      groupKeys
        .filter((groupKey) => !context.hiddenGroups.includes(groupKey))
        .map((groupKey) => ({ bandKey, groupKey })),
    ),
  );
};

const mapColumn = (
  bands: readonly PageViewBand[],
  address: BoardColumnAddress,
  change: (rows: readonly PageRow[]) => readonly PageRow[],
): readonly PageViewBand[] =>
  bands.map((band) =>
    band.key === address.bandKey
      ? {
          ...band,
          groups: band.groups.map((group) =>
            group.key === address.groupKey ? { ...group, rows: change(group.rows) } : group,
          ),
        }
      : band,
  );

/** A column as the server read it again: its cards and where they end replace what the board held. */
export const replaceBoardColumn = (
  bands: readonly PageViewBand[],
  address: BoardColumnAddress,
  read: { readonly nextCursor: null | string; readonly rows: readonly PageRow[] },
): readonly PageViewBand[] =>
  bands.map((band) =>
    band.key === address.bandKey
      ? {
          ...band,
          groups: band.groups.map((group) =>
            group.key === address.groupKey ? { ...group, nextCursor: read.nextCursor, rows: read.rows } : group,
          ),
        }
      : band,
  );

const removeRowFrom = (rows: readonly PageRow[], rowId: string): readonly PageRow[] =>
  rows.filter((row) => row.id !== rowId);

/** Where a row goes in rows already ordered by the sorts; the end of the rows when nothing sorts after it. */
const findSortedIndex = (rows: readonly PageRow[], row: PageRow, context: BoardPlacementContext): number => {
  const index = rows.findIndex((candidate) => compareRows(row, candidate, context) < 0);
  return index === -1 ? rows.length : index;
};

const insertAt = (rows: readonly PageRow[], row: PageRow, index: number): readonly PageRow[] => [
  ...rows.slice(0, index),
  row,
  ...rows.slice(index),
];

const withoutRow = (
  progress: BoardPlacementProgress,
  rowId: string,
  addresses: readonly BoardColumnAddress[],
): BoardPlacementProgress => ({
  ...progress,
  bands: addresses.reduce(
    (bands, address) => mapColumn(bands, address, (rows) => removeRowFrom(rows, rowId)),
    progress.bands,
  ),
  isCountChanged: progress.isCountChanged || addresses.length > 0,
});

const addToColumn = (
  progress: BoardPlacementProgress,
  row: PageRow,
  address: BoardColumnAddress,
  context: BoardPlacementContext,
): BoardPlacementProgress => {
  const column = findColumn(progress.bands, address);
  if (column === undefined) return progress;
  if (context.sorts.length === 0) {
    return { ...progress, isCountChanged: true, refreshColumns: [...progress.refreshColumns, address] };
  }
  const index = findSortedIndex(column.rows, row, context);
  const isBeyondLoaded = column.nextCursor !== null && index === column.rows.length;
  if (isBeyondLoaded) return { ...progress, isCountChanged: true };
  return {
    ...progress,
    bands: mapColumn(progress.bands, address, (rows) => insertAt(rows, row, index)),
    isCountChanged: true,
  };
};

const updateInColumn = (
  progress: BoardPlacementProgress,
  row: PageRow,
  address: BoardColumnAddress,
  context: BoardPlacementContext,
): BoardPlacementProgress => {
  if (context.sorts.length === 0) {
    const bands = mapColumn(progress.bands, address, (rows) => rows.map((held) => (held.id === row.id ? row : held)));
    return { ...progress, bands };
  }
  const without = mapColumn(progress.bands, address, (rows) => removeRowFrom(rows, row.id));
  const column = findColumn(without, address);
  if (column === undefined) return progress;
  const index = findSortedIndex(column.rows, row, context);
  return { ...progress, bands: mapColumn(without, address, (rows) => insertAt(rows, row, index)) };
};

const placeRow = (
  progress: BoardPlacementProgress,
  row: PageRow,
  context: BoardPlacementContext,
): Result<BoardPlacementProgress, BoardRequeryReason> => {
  const previous = listColumns(progress.bands)
    .flatMap((column) => column.rows)
    .find((held) => held.id === row.id);
  const desiredResult = passesFilter(row, context)
    ? toDesiredAddresses(row, previous, progress.bands, context)
    : Result.ok<readonly BoardColumnAddress[], BoardRequeryReason>([]);
  if (desiredResult.isFail()) return Result.fail(desiredResult.getError());
  const desired = desiredResult.getValue();
  if (desired.some((address) => findColumn(progress.bands, address) === undefined)) {
    return Result.fail('unknown-group');
  }
  const held = listHeldAddresses(progress.bands, row.id);
  const desiredKeys = new Set(desired.map(addressKey));
  const heldKeys = new Set(held.map(addressKey));
  const removed = withoutRow(
    progress,
    row.id,
    held.filter((address) => !desiredKeys.has(addressKey(address))),
  );
  const kept = desired.filter((address) => heldKeys.has(addressKey(address)));
  const added = desired.filter((address) => !heldKeys.has(addressKey(address)));
  const updated = kept.reduce((state, address) => updateInColumn(state, row, address, context), removed);
  return Result.ok(added.reduce((state, address) => addToColumn(state, row, address, context), updated));
};

const dedupeAddresses = (addresses: readonly BoardColumnAddress[]): readonly BoardColumnAddress[] => [
  ...new Map(addresses.map((address) => [addressKey(address), address])).values(),
];

const placeAll = (input: BoardPlacementInput): Result<BoardPlacementProgress, BoardRequeryReason> => {
  const start: BoardPlacementProgress = { bands: input.bands, isCountChanged: false, refreshColumns: [] };
  const withTrashed = input.trashedIds.reduce(
    (progress, id) => withoutRow(progress, id, listHeldAddresses(progress.bands, id)),
    start,
  );
  return input.changedRows.reduce<Result<BoardPlacementProgress, BoardRequeryReason>>(
    (result, row) => (result.isFail() ? result : placeRow(result.getValue(), row, input.context)),
    Result.ok(withTrashed),
  );
};

/**
 * Where the cards that others changed go on the board, decided in the browser with the engine the server is tested
 * against. Cards whose place depends on a manual order are not placed: their column is named to be read again. When
 * the browser cannot tell at all, the answer is to read the view again, and says why (the table in ADR 026).
 */
export const placeChangedBoardRows = (input: BoardPlacementInput): BoardPlacement => {
  const undecidable = findUndecidableReason(input.context);
  if (undecidable !== null) return { kind: 'requery', reason: undecidable };
  const placed = placeAll({ ...input, context: resolveContext(input.context) });
  if (placed.isFail()) return { kind: 'requery', reason: placed.getError() };
  const done = placed.getValue();
  return {
    bands: done.bands,
    isCountChanged: done.isCountChanged,
    kind: 'placed',
    refreshColumns: dedupeAddresses(done.refreshColumns),
  };
};
