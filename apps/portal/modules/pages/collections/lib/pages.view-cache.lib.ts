import { isPageComputedPropertyType, PAGE_VIEW_TYPE } from '@neuma/shared';
import { PAGE_VIEW_CALCULATION_ITEM_PREFIX } from '../constants/pages.query.constants';
import type { PageRow, PageSchemaProperty, PageViewAggregates, PageViewBand } from '../types/pages.schema.types';
import type {
  CachedBandLayout,
  CachedView,
  CachedViewLayout,
  ReadCachedView,
  ToCachedViewInput,
  ViewCacheKeyInput,
} from '../types/pages.view-cache.types';
import { readViewBands } from './pages.view-bands.lib';

/** The key a view is kept under: the page and the question the address asks of it, word for word. */
export const buildViewCacheKey = ({ day, filter, month, pageId, search, viewName }: ViewCacheKeyInput): string =>
  JSON.stringify([pageId, viewName, search ?? '', filter ?? '', month ?? '', day ?? '']);

/** A computed value is worked out on every read and never trusted from a copy (ADR 029). */
export const stripComputedValues = (
  rows: readonly PageRow[],
  properties: readonly PageSchemaProperty[],
): readonly PageRow[] => {
  const computedKeys = new Set(
    properties.filter((property) => isPageComputedPropertyType(property.type)).map((property) => property.key),
  );
  if (computedKeys.size === 0) return rows;
  return rows.map((row) => {
    const { computedErrors: _computedErrors, ...rest } = row;
    const kept = Object.entries(row.propertyValues ?? {}).filter(([key]) => !computedKeys.has(key));
    return { ...rest, propertyValues: row.propertyValues === null ? null : Object.fromEntries(kept) };
  });
};

const isCalculationOfKeys = (item: string, keys: ReadonlySet<string>): boolean => {
  const named = item.slice(PAGE_VIEW_CALCULATION_ITEM_PREFIX.length);
  return keys.has(named.slice(0, named.lastIndexOf(':')));
};

const withoutCalculationsOf = (
  calculations: Readonly<Record<string, number | null>>,
  keys: ReadonlySet<string>,
): Readonly<Record<string, number | null>> =>
  Object.fromEntries(Object.entries(calculations).filter(([item]) => !isCalculationOfKeys(item, keys)));

/** What a calculation over a formula or rollup says is worked out on every read, like the cells it sums (ADR 029). */
export const stripComputedAggregates = (
  aggregates: PageViewAggregates | null,
  properties: readonly PageSchemaProperty[],
): PageViewAggregates | null => {
  const computedKeys = new Set(
    properties.filter((property) => isPageComputedPropertyType(property.type)).map((property) => property.key),
  );
  if (aggregates === null || computedKeys.size === 0) return aggregates;
  return {
    ...aggregates,
    calculations: withoutCalculationsOf(aggregates.calculations, computedKeys),
    groupCalculations: Object.fromEntries(
      Object.entries(aggregates.groupCalculations).map(([group, values]) => [
        group,
        withoutCalculationsOf(values, computedKeys),
      ]),
    ),
  };
};

/** A calendar or a timeline holds its rows as the days on screen and not as groups. */
export const isWindowView = (type: string): boolean =>
  type === PAGE_VIEW_TYPE.CALENDAR || type === PAGE_VIEW_TYPE.TIMELINE;

const toBandLayouts = (bands: readonly PageViewBand[]): readonly CachedBandLayout[] =>
  bands.map((band) => ({
    color: band.color,
    groups: band.groups.map((group) => ({
      color: group.color,
      key: group.key,
      label: group.label,
      nextCursor: group.nextCursor ?? null,
      rowIds: group.rows.map((row) => row.id),
    })),
    key: band.key,
    label: band.label,
  }));

const listLayoutRows = (input: ToCachedViewInput, bands: readonly PageViewBand[]): readonly PageRow[] => {
  const { outcome } = input;
  const windowRows = outcome.kind === 'FLAT_ROWS' && isWindowView(input.view.type) ? outcome.rows : [];
  const undatedRows = outcome.kind === 'FLAT_ROWS' ? (outcome.timeline?.undatedRows ?? []) : [];
  return [...bands.flatMap((band) => band.groups.flatMap((group) => group.rows)), ...windowRows, ...undatedRows];
};

/** A view as the server drew it, turned into what the cache keeps: the layout as text and the rows apart. */
export const toCachedView = (input: ToCachedViewInput): CachedView => {
  const { outcome, schema, view } = input;
  const isWindow = isWindowView(view.type);
  const bands = isWindow ? [] : readViewBands(outcome);
  const rows = stripComputedValues(
    [...new Map(listLayoutRows(input, bands).map((row) => [row.id, row])).values()],
    schema.properties,
  );
  const layout: CachedViewLayout = {
    aggregates: stripComputedAggregates(input.aggregates, schema.properties),
    bands: toBandLayouts(bands),
    calendar: outcome.kind === 'FLAT_ROWS' ? (outcome.calendar ?? null) : null,
    lookups: input.lookups,
    personOptions: input.personOptions,
    schema,
    timeline:
      outcome.kind === 'FLAT_ROWS' && outcome.timeline !== undefined
        ? { ...outcome.timeline, undatedRowIds: outcome.timeline.undatedRows.map((row) => row.id) }
        : null,
    viewId: view.id,
    viewerId: input.viewerId,
    windowRowIds: isWindow && outcome.kind === 'FLAT_ROWS' ? outcome.rows.map((row) => row.id) : [],
  };
  return { ids: rows.map((row) => row.id), layout: JSON.stringify(layout), rows };
};

const isLayoutText = (value: unknown): value is CachedViewLayout => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.viewId === 'string' &&
    Array.isArray(candidate.bands) &&
    Array.isArray(candidate.windowRowIds) &&
    typeof candidate.schema === 'object' &&
    candidate.schema !== null
  );
};

const resolveRows = (ids: readonly string[], rowsById: ReadonlyMap<string, PageRow>): readonly PageRow[] | null => {
  const rows = ids.map((id) => rowsById.get(id));
  return rows.every((row): row is PageRow => row !== undefined) ? rows : null;
};

const resolveBand = (band: CachedBandLayout, rowsById: ReadonlyMap<string, PageRow>): PageViewBand | null => {
  const groups = band.groups.map((group) => {
    const rows = resolveRows(group.rowIds, rowsById);
    return rows === null
      ? null
      : { color: group.color, key: group.key, label: group.label, nextCursor: group.nextCursor, rows };
  });
  return groups.every((group) => group !== null)
    ? { color: band.color, groups: groups.filter((group) => group !== null), key: band.key, label: band.label }
    : null;
};

/**
 * A kept layout with its rows put back, or null when it cannot be: the text is not a layout this code wrote, its view
 * is gone from the shape, or a row it names is not held. A miss is never a wrong view.
 */
export const readCachedViewLayout = (text: string, rowsById: ReadonlyMap<string, PageRow>): ReadCachedView | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isLayoutText(parsed)) return null;
  const view = parsed.schema.views.find((candidate) => candidate.id === parsed.viewId);
  const bands = parsed.bands.map((band) => resolveBand(band, rowsById));
  const windowRows = resolveRows(parsed.windowRowIds, rowsById);
  const undatedRows = resolveRows(parsed.timeline?.undatedRowIds ?? [], rowsById);
  if (view === undefined || windowRows === null || undatedRows === null || !bands.every((band) => band !== null)) {
    return null;
  }
  return {
    aggregates: parsed.aggregates,
    bands: bands.filter((band) => band !== null),
    calendar: parsed.calendar,
    lookups: parsed.lookups,
    personOptions: parsed.personOptions,
    schema: parsed.schema,
    timeline: parsed.timeline === null ? null : { ...parsed.timeline, undatedRows },
    view,
    viewerId: parsed.viewerId,
    windowRows,
  };
};
