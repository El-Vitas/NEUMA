import { UNASSIGNED_GROUP_KEY } from '../constants/page-view.constants.js';
import { sortPageOptionsByGroup } from '../page-property/page-property.option.lib.js';
import { readPagePropertyValue } from '../page-property/page-property.lib.js';
import type { PagePropertyValue, PagePropertyValues } from '../page-property/page-property.types.js';
import { PAGE_STATUS_GROUP_VALUES } from '../page-property/page-property.types.js';
import { Result } from '../result.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { computePageCalculation } from './page-view.calculation.lib.js';
import { findInvalidPageFilterToken, resolvePageFilter } from './page-view.relative.lib.js';
import type { PageFilterViewer } from './page-view.relative.types.js';
import { comparePageRowsBySorts } from './page-view.sort.lib.js';
import { matchesPageFilter } from './page-view.filter.lib.js';
import type {
  PageQueryAggregationGroupOutcome,
  PageQueryAggregationItem,
  PageQueryAggregationsOutcome,
  PageQueryAggregationsReducer,
  PageQueryGroupOutcome,
  PageQueryGroupResultsReducer,
  PageQueryGroupsOutcome,
  PageQueryGroupsReducer,
  PageQueryOutcome,
  PageQueryRequest,
  PageQueryResultsOutcome,
  PageQueryResultsReducer,
} from './page-view.query.types.js';
import { PAGE_QUERY_LIMITS } from './page-view.query.types.js';
import type { PageFilter, PageGroupByMode, PageViewConfiguration, PageViewProperty } from './page-view.types.js';
import { PAGE_FILTER_GROUP_OPERATOR, PAGE_GROUP_BY_MODE, PAGE_VIEW_CALCULATION } from './page-view.types.js';

/** A row as the engine reads it: what the server sends of a row, whatever else the caller holds. */
export interface LocalPageQueryRow {
  readonly id: string;
  readonly propertyValues: PagePropertyValues | null;
  readonly title: string;
}

/** Why the browser cannot answer and the server has to (ADR 029). */
export type LocalPageQueryRefusal = 'invalid-filter' | 'search' | 'unsupported-grouping';

export interface LocalPageQueryInput<Row extends LocalPageQueryRow> {
  readonly configuration: PageViewConfiguration;
  readonly context: PageFilterViewer;
  readonly properties: readonly PageViewProperty[];
  readonly request: Pick<PageQueryRequest, 'quickFilter' | 'reducers' | 'search' | 'sorts'>;
  /** Every row the reader can open, in the manual order of the view: ties are decided by this order. */
  readonly rows: readonly Row[];
}

const CURSOR_PREFIX = 'local:';

const CHECKBOX_KEYS: readonly string[] = ['true', 'false'];

const MULTI_VALUE_TYPES: readonly string[] = [PAGE_PROPERTY_TYPE.MULTI_SELECT];

interface Axis {
  readonly declaredKeys: readonly string[];
  readonly hasUnassignedGroup: boolean;
  readonly mode: PageGroupByMode;
  readonly property: PageViewProperty;
  readonly statusGroupByOption: Readonly<Record<string, string>> | null;
}

interface Placed<Row extends LocalPageQueryRow> {
  readonly main: readonly (null | string)[];
  readonly row: Row;
  readonly sub: readonly (null | string)[];
}

const encodeCursor = (offset: number): string => `${CURSOR_PREFIX}${String(offset)}`;

const decodeCursor = (cursor: string | undefined): number => {
  if (cursor === undefined || !cursor.startsWith(CURSOR_PREFIX)) return 0;
  const offset = Number(cursor.slice(CURSOR_PREFIX.length));
  return Number.isInteger(offset) && offset > 0 ? offset : 0;
};

const clamp = (value: number | undefined, fallback: number, maximum: number): number =>
  Math.min(maximum, Math.max(0, value ?? fallback));

const toPublicKey = (key: null | string): string => key ?? UNASSIGNED_GROUP_KEY;

const readTitleKey = (properties: readonly PageViewProperty[]): null | string =>
  properties.find((property) => property.type === PAGE_PROPERTY_TYPE.TITLE)?.key ?? null;

const readValues = (row: LocalPageQueryRow, titleKey: null | string): PagePropertyValues =>
  titleKey === null ? (row.propertyValues ?? {}) : { ...row.propertyValues, [titleKey]: row.title };

const combineFilters = (viewFilter: PageFilter | null, quickFilter: PageFilter | undefined): PageFilter | null => {
  if (quickFilter === undefined) return viewFilter;
  if (viewFilter === null) return quickFilter;
  return { conditions: [viewFilter, quickFilter], kind: 'GROUP', operator: PAGE_FILTER_GROUP_OPERATOR.AND };
};

const selectRows = <Row extends LocalPageQueryRow>(
  input: LocalPageQueryInput<Row>,
  titleKey: null | string,
): Result<readonly Row[], LocalPageQueryRefusal> => {
  const { configuration, context, properties, request, rows } = input;
  const combined = combineFilters(configuration.filter, request.quickFilter);
  if (combined === null) return Result.ok(rows);
  if (findInvalidPageFilterToken(combined, properties) !== null) return Result.fail('invalid-filter');
  const resolved = resolvePageFilter(combined, properties, context);
  return Result.ok(
    rows.filter((row) =>
      matchesPageFilter(resolved, readValues(row, titleKey), properties, { timeZone: context.timeZone }),
    ),
  );
};

const sortRows = <Row extends LocalPageQueryRow>(
  rows: readonly Row[],
  input: LocalPageQueryInput<Row>,
  titleKey: null | string,
): readonly Row[] => {
  const sorts = input.request.sorts ?? input.configuration.sorts;
  if (sorts.length === 0) return rows;
  return rows.toSorted((left, right) =>
    comparePageRowsBySorts(sorts, readValues(left, titleKey), readValues(right, titleKey), input.properties),
  );
};

const readStatusGroups = (property: PageViewProperty): Readonly<Record<string, string>> =>
  Object.fromEntries(
    (property.options ?? []).flatMap((option) => (option.group === null ? [] : [[option.id, option.group]])),
  );

const readDeclaredKeys = (property: PageViewProperty, mode: PageGroupByMode): readonly string[] | null => {
  if (property.type === PAGE_PROPERTY_TYPE.CHECKBOX) return CHECKBOX_KEYS;
  if (property.type === PAGE_PROPERTY_TYPE.STATUS) {
    return mode === PAGE_GROUP_BY_MODE.GROUP
      ? PAGE_STATUS_GROUP_VALUES
      : sortPageOptionsByGroup(property.options ?? []).map((option) => option.id);
  }
  if (property.type !== PAGE_PROPERTY_TYPE.SELECT && property.type !== PAGE_PROPERTY_TYPE.MULTI_SELECT) return null;
  return property.options === undefined || property.options === null ? null : property.options.map((o) => o.id);
};

const resolveAxis = (
  properties: readonly PageViewProperty[],
  key: string,
  mode: PageGroupByMode,
): Result<Axis, LocalPageQueryRefusal> => {
  const property = properties.find((candidate) => candidate.key === key);
  const declaredKeys = property === undefined ? null : readDeclaredKeys(property, mode);
  if (property === undefined || declaredKeys === null) return Result.fail('unsupported-grouping');
  const isStatus = property.type === PAGE_PROPERTY_TYPE.STATUS;
  const effectiveMode = isStatus ? mode : PAGE_GROUP_BY_MODE.OPTION;
  return Result.ok({
    declaredKeys,
    hasUnassignedGroup: !isStatus,
    mode: effectiveMode,
    property,
    statusGroupByOption: isStatus && effectiveMode === PAGE_GROUP_BY_MODE.GROUP ? readStatusGroups(property) : null,
  });
};

const readText = (value: PagePropertyValue | undefined): null | string => {
  if (typeof value === 'string') return value === '' ? null : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const readEntries = (value: PagePropertyValue | undefined): readonly string[] =>
  Array.isArray(value) ? value.map(String) : [];

const readSingleKey = (axis: Axis, value: PagePropertyValue | undefined): null | string => {
  if (axis.property.type === PAGE_PROPERTY_TYPE.CHECKBOX) return typeof value === 'boolean' ? String(value) : null;
  const text = readText(value);
  if (axis.statusGroupByOption === null || text === null) return text;
  return axis.statusGroupByOption[text] ?? null;
};

const declaredOrNothing = (axis: Axis, key: null | string): null | string =>
  key !== null && axis.declaredKeys.includes(key) ? key : null;

/** The groups a row is in on one axis: every value of a list, and `null` for the group without a value. */
const readRowKeys = (axis: Axis, values: PagePropertyValues): readonly (null | string)[] => {
  const value = readPagePropertyValue(values, axis.property.key);
  if (MULTI_VALUE_TYPES.includes(axis.property.type)) {
    const entries = readEntries(value);
    if (entries.length === 0) return [null];
    return [...new Set(entries.map((entry) => declaredOrNothing(axis, entry)))];
  }
  return [declaredOrNothing(axis, readSingleKey(axis, value))];
};

const placeRows = <Row extends LocalPageQueryRow>(
  rows: readonly Row[],
  main: Axis,
  sub: Axis | null,
  titleKey: null | string,
): readonly Placed<Row>[] =>
  rows.map((row) => {
    const values = readValues(row, titleKey);
    return { main: readRowKeys(main, values), row, sub: sub === null ? [null] : readRowKeys(sub, values) };
  });

const listAxisEntries = (axis: Axis, groupLimit: number): readonly (null | string)[] => [
  ...axis.declaredKeys.slice(0, groupLimit),
  ...(axis.hasUnassignedGroup ? [null] : []),
];

const sliceIds = (
  rows: readonly LocalPageQueryRow[],
  offset: number,
  limit: number,
): { readonly ids: readonly string[]; readonly nextCursor: null | string } => {
  const page = rows.slice(offset, offset + limit);
  const end = offset + page.length;
  return { ids: page.map((row) => row.id), nextCursor: end < rows.length ? encodeCursor(end) : null };
};

const runResults = (reducer: PageQueryResultsReducer, rows: readonly LocalPageQueryRow[]): PageQueryResultsOutcome => {
  const limit = clamp(reducer.limit, PAGE_QUERY_LIMITS.defaultResultsLimit, PAGE_QUERY_LIMITS.maximumFullResultsLimit);
  return { ...sliceIds(rows, decodeCursor(reducer.cursor), limit), kind: 'results' };
};

const isInCell = <Row extends LocalPageQueryRow>(
  placed: Placed<Row>,
  mainKey: null | string,
  subKey: null | string,
  hasSub: boolean,
): boolean => placed.main.includes(mainKey) && (!hasSub || placed.sub.includes(subKey));

const readAxes = (
  configuration: PageViewConfiguration,
  properties: readonly PageViewProperty[],
  overrides: { readonly groupBy?: string | undefined; readonly subGroupBy?: string | undefined },
  wantsSub: boolean,
): Result<{ readonly main: Axis; readonly sub: Axis | null }, LocalPageQueryRefusal> => {
  const mainKey = overrides.groupBy ?? configuration.groupBy;
  if (mainKey === null) return Result.fail('unsupported-grouping');
  const main = resolveAxis(properties, mainKey, configuration.groupByMode);
  if (main.isFail()) return Result.fail(main.getError());
  const subKey = overrides.subGroupBy ?? configuration.subGroupBy;
  if (subKey === null || !wantsSub) return Result.ok({ main: main.getValue(), sub: null });
  const sub = resolveAxis(properties, subKey, PAGE_GROUP_BY_MODE.OPTION);
  if (sub.isFail()) return Result.fail(sub.getError());
  return Result.ok({ main: main.getValue(), sub: sub.getValue() });
};

/** A group of the view, or one cell of it when it has two groupings, with every row in it in reading order. */
export interface LocalPageCell<Row extends LocalPageQueryRow> {
  readonly isHidden: boolean;
  readonly key: string;
  readonly rows: readonly Row[];
  readonly subKey: null | string;
}

export interface LocalPageCells<Row extends LocalPageQueryRow> {
  readonly cells: readonly LocalPageCell<Row>[];
  readonly hasMoreGroups: boolean;
}

export interface LocalPageGrouping {
  readonly groupBy?: string | undefined;
  readonly groupLimit?: number | undefined;
  readonly includeHidden?: boolean | undefined;
  readonly subGroupBy?: string | undefined;
}

const readCells = <Row extends LocalPageQueryRow>(
  rows: readonly Row[],
  input: LocalPageQueryInput<Row>,
  titleKey: null | string,
  grouping: LocalPageGrouping,
): Result<LocalPageCells<Row>, LocalPageQueryRefusal> => {
  const { configuration, properties } = input;
  const axes = readAxes(configuration, properties, grouping, true);
  if (axes.isFail()) return Result.fail(axes.getError());
  const { main, sub } = axes.getValue();
  const groupLimit = clamp(
    grouping.groupLimit,
    PAGE_QUERY_LIMITS.defaultGroupLimit,
    PAGE_QUERY_LIMITS.maximumGroupLimit,
  );
  const hidden = new Set([
    ...configuration.hiddenGroups,
    ...(configuration.hidesUnassignedColumn ? [UNASSIGNED_GROUP_KEY] : []),
  ]);
  const mainEntries = listAxisEntries(main, groupLimit).map((key) => ({
    isHidden: hidden.has(toPublicKey(key)),
    key,
  }));
  const subEntries = sub === null ? [null] : listAxisEntries(sub, groupLimit);
  const shownMain = grouping.includeHidden === true ? mainEntries : mainEntries.filter((entry) => !entry.isHidden);
  const placed = placeRows(rows, main, sub, titleKey);
  const cells = shownMain.flatMap((entry) =>
    subEntries.map(
      (subKey): LocalPageCell<Row> => ({
        isHidden: entry.isHidden,
        key: toPublicKey(entry.key),
        rows: placed
          .filter((candidate) => isInCell(candidate, entry.key, subKey, sub !== null))
          .map((candidate) => candidate.row),
        subKey: sub === null ? null : toPublicKey(subKey),
      }),
    ),
  );
  const filledKeys = new Set(cells.filter((cell) => cell.rows.length > 0).map((cell) => cell.key));
  return Result.ok({
    cells: configuration.hidesEmptyGroups ? cells.filter((cell) => filledKeys.has(cell.key)) : cells,
    hasMoreGroups: main.declaredKeys.length > groupLimit || (sub?.declaredKeys.length ?? 0) > groupLimit,
  });
};

const runGroups = <Row extends LocalPageQueryRow>(
  reducer: PageQueryGroupsReducer,
  rows: readonly Row[],
  input: LocalPageQueryInput<Row>,
  titleKey: null | string,
): Result<PageQueryGroupsOutcome, LocalPageQueryRefusal> => {
  const read = readCells(rows, input, titleKey, reducer);
  if (read.isFail()) return Result.fail(read.getError());
  const rowsPerGroup = clamp(
    reducer.rowsPerGroup,
    PAGE_QUERY_LIMITS.defaultRowsPerGroup,
    PAGE_QUERY_LIMITS.maximumRowsPerGroup,
  );
  const { cells, hasMoreGroups } = read.getValue();
  return Result.ok({
    groups: cells.map(
      (cell): PageQueryGroupOutcome => ({
        ...sliceIds(cell.rows, 0, rowsPerGroup),
        isHidden: cell.isHidden,
        key: cell.key,
        subKey: cell.subKey,
      }),
    ),
    hasMoreGroups,
    kind: 'groups',
  });
};

const toRawKey = (publicKey: string): null | string => (publicKey === UNASSIGNED_GROUP_KEY ? null : publicKey);

const runGroupResults = <Row extends LocalPageQueryRow>(
  reducer: PageQueryGroupResultsReducer,
  rows: readonly Row[],
  input: LocalPageQueryInput<Row>,
  titleKey: null | string,
): Result<PageQueryResultsOutcome, LocalPageQueryRefusal> => {
  const axes = readAxes(input.configuration, input.properties, reducer, reducer.group.subKey !== undefined);
  if (axes.isFail()) return Result.fail(axes.getError());
  const { main, sub } = axes.getValue();
  const limit = clamp(reducer.limit, PAGE_QUERY_LIMITS.defaultRowsPerGroup, PAGE_QUERY_LIMITS.maximumResultsLimit);
  const subKey = reducer.group.subKey === undefined ? null : toRawKey(reducer.group.subKey);
  const inCell = placeRows(rows, main, sub, titleKey)
    .filter((candidate) => isInCell(candidate, toRawKey(reducer.group.key), subKey, sub !== null))
    .map((candidate) => candidate.row);
  return Result.ok({ ...sliceIds(inCell, decodeCursor(reducer.cursor), limit), kind: 'results' });
};

const aggregateItem = (
  item: PageQueryAggregationItem,
  rows: readonly LocalPageQueryRow[],
  properties: readonly PageViewProperty[],
  titleKey: null | string,
): number | null => {
  if (item.calculation === PAGE_VIEW_CALCULATION.NONE) return null;
  if (item.calculation === PAGE_VIEW_CALCULATION.COUNT_ALL) return rows.length;
  if (item.propertyKey === null) return null;
  const property = properties.find((candidate) => candidate.key === item.propertyKey);
  if (property === undefined) return null;
  const values = rows.map((row) => readPagePropertyValue(readValues(row, titleKey), property.key));
  return computePageCalculation(item.calculation, property.type, values);
};

const aggregateValues = (
  items: readonly PageQueryAggregationItem[],
  rows: readonly LocalPageQueryRow[],
  properties: readonly PageViewProperty[],
  titleKey: null | string,
): Readonly<Record<string, number | null>> =>
  Object.fromEntries(items.map((item) => [item.id, aggregateItem(item, rows, properties, titleKey)]));

const runAggregations = <Row extends LocalPageQueryRow>(
  reducer: PageQueryAggregationsReducer,
  rows: readonly Row[],
  input: LocalPageQueryInput<Row>,
  titleKey: null | string,
): Result<PageQueryAggregationsOutcome, LocalPageQueryRefusal> => {
  const { items } = reducer;
  const { properties } = input;
  const totals = aggregateValues(items, rows, properties, titleKey);
  if (reducer.by === 'NONE') {
    return Result.ok({ distinctRowCount: rows.length, groups: [], kind: 'aggregations', totals });
  }
  const axes = readAxes(input.configuration, properties, reducer, true);
  if (axes.isFail()) return Result.fail(axes.getError());
  const { main, sub } = axes.getValue();
  const cells = new Map<
    string,
    { readonly key: null | string; readonly rows: Row[]; readonly subKey: null | string }
  >();
  for (const placed of placeRows(rows, main, sub, titleKey)) {
    for (const key of placed.main) {
      for (const subKey of placed.sub) {
        const address = JSON.stringify([key, subKey]);
        const cell = cells.get(address) ?? { key, rows: [], subKey };
        cell.rows.push(placed.row);
        cells.set(address, cell);
      }
    }
  }
  const groups = [...cells.values()].map(
    (cell): PageQueryAggregationGroupOutcome => ({
      key: toPublicKey(cell.key),
      subKey: cell.subKey === null ? null : toPublicKey(cell.subKey),
      values: aggregateValues(items, cell.rows, properties, titleKey),
    }),
  );
  return Result.ok({ distinctRowCount: rows.length, groups, kind: 'aggregations', totals });
};

const runReducer = <Row extends LocalPageQueryRow>(
  reducer: PageQueryRequest['reducers'][number],
  rows: readonly Row[],
  input: LocalPageQueryInput<Row>,
  titleKey: null | string,
): Result<PageQueryOutcome, LocalPageQueryRefusal> => {
  switch (reducer.kind) {
    case 'results':
      return Result.ok(runResults(reducer, rows));
    case 'groups':
      return runGroups(reducer, rows, input, titleKey);
    case 'groupResults':
      return runGroupResults(reducer, rows, input, titleKey);
    default:
      return runAggregations(reducer, rows, input, titleKey);
  }
};

const orderRows = <Row extends LocalPageQueryRow>(
  input: LocalPageQueryInput<Row>,
  titleKey: null | string,
): Result<readonly Row[], LocalPageQueryRefusal> => {
  if ((input.request.search ?? '').trim() !== '') return Result.fail('search');
  const selected = selectRows(input, titleKey);
  return selected.isFail() ? selected : Result.ok(sortRows(selected.getValue(), input, titleKey));
};

/** Every row the view lets through, in the order it reads them. */
export const listLocalPageRows = <Row extends LocalPageQueryRow>(
  input: LocalPageQueryInput<Row>,
): Result<readonly Row[], LocalPageQueryRefusal> => orderRows(input, readTitleKey(input.properties));

/** Every group of the view with all of its rows, which a screen windows itself instead of asking page after page. */
export const listLocalPageCells = <Row extends LocalPageQueryRow>(
  input: LocalPageQueryInput<Row>,
  grouping: LocalPageGrouping = {},
): Result<LocalPageCells<Row>, LocalPageQueryRefusal> => {
  const titleKey = readTitleKey(input.properties);
  const ordered = orderRows(input, titleKey);
  return ordered.isFail() ? Result.fail(ordered.getError()) : readCells(ordered.getValue(), input, titleKey, grouping);
};

/**
 * Answers a view query in the browser from rows it already holds, with the engine the server is tested against. The
 * outcomes have the shape of the server's, so a view draws them the same way (ADR 029). A question only the server can
 * answer (a search, a grouping by what has no list of groups) is refused with the reason.
 */
export const runLocalPageQuery = <Row extends LocalPageQueryRow>(
  input: LocalPageQueryInput<Row>,
): Result<Readonly<Record<string, PageQueryOutcome>>, LocalPageQueryRefusal> => {
  const titleKey = readTitleKey(input.properties);
  const ordered = orderRows(input, titleKey);
  if (ordered.isFail()) return Result.fail(ordered.getError());
  const outcomes: Record<string, PageQueryOutcome> = {};
  for (const reducer of input.request.reducers) {
    const outcome = runReducer(reducer, ordered.getValue(), input, titleKey);
    if (outcome.isFail()) return Result.fail(outcome.getError());
    outcomes[reducer.id] = outcome.getValue();
  }
  return Result.ok(outcomes);
};
