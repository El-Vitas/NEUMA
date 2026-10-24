import type { LocalPageCell, LocalPageQueryInput, LocalPageQueryRefusal, PageViewConfiguration } from '@neuma/shared';
import {
  listLocalPageCells,
  listLocalPageRows,
  PAGE_GROUP_BY_MODE,
  PAGE_VIEW_SHAPE,
  Result,
  readPageViewConfiguration,
  readPageViewShape,
  runLocalPageQuery,
  UNASSIGNED_GROUP_KEY,
} from '@neuma/shared';
import {
  PAGE_VIEW_COUNTS_REDUCER,
  PAGE_VIEW_FIRST_CARDS_PER_COLUMN,
  PAGE_VIEW_FIRST_ROWS,
  PAGE_VIEW_FLAT_GROUP_KEY,
  PAGE_VIEW_LOCAL_CURSOR,
} from '../constants/pages.query.constants';
import type { ClientViewInput, ClientViewReading } from '../types/pages.client-view.types';
import type { PageRow, PageViewBand, PageViewGroup, PageViewOutcome } from '../types/pages.schema.types';
import { toViewAggregatesFromOutcome } from './pages.query-aggregates.lib';
import { describeGroupKey } from './pages.query-outcome.lib';
import { toViewProperties } from './pages.view-properties.lib';
import { buildViewCountsQuery } from './pages.view-query.lib';

/** The key under which the browser counts how many rows a group shows. */
export const toShownKey = (bandKey: string, groupKey: string): string => `${bandKey}|${groupKey}`;

const toQuery = (input: ClientViewInput): LocalPageQueryInput<PageRow> => ({
  configuration: readPageViewConfiguration(input.view.configuration),
  context: { now: input.readNow(), timeZone: input.timeZone, viewerId: input.viewerId },
  properties: toViewProperties(input.properties),
  request: { ...(input.quickFilter === null ? {} : { quickFilter: input.quickFilter }), reducers: [] },
  rows: input.rows,
});

const showRows = (
  rows: readonly PageRow[],
  shown: ClientViewInput['shown'],
  address: string,
  firstPage: number,
): Pick<PageViewGroup, 'nextCursor' | 'rows'> => {
  const count = shown[address] ?? firstPage;
  return { nextCursor: rows.length > count ? PAGE_VIEW_LOCAL_CURSOR : null, rows: rows.slice(0, count) };
};

const toFlatReading = (
  rows: readonly PageRow[],
  input: ClientViewInput,
): Pick<ClientViewReading, 'bands' | 'outcome'> => {
  const shown = showRows(rows, input.shown, toShownKey('', PAGE_VIEW_FLAT_GROUP_KEY), PAGE_VIEW_FIRST_ROWS);
  const group: PageViewGroup = { color: null, key: PAGE_VIEW_FLAT_GROUP_KEY, label: '', ...shown };
  return {
    bands: [{ color: null, groups: [group], key: '', label: '' }],
    outcome: { kind: 'FLAT_ROWS', nextCursor: shown.nextCursor ?? null, rows: shown.rows },
  };
};

const toGroup = (
  cell: LocalPageCell<PageRow>,
  input: ClientViewInput,
  configuration: PageViewConfiguration,
): PageViewGroup => {
  const property = input.properties.find((candidate) => candidate.key === configuration.groupBy);
  const bandKey = cell.subKey ?? '';
  return {
    ...describeGroupKey(property, configuration.groupByMode, cell.key, input.statusGroupLabel),
    key: cell.key,
    ...showRows(cell.rows, input.shown, toShownKey(bandKey, cell.key), PAGE_VIEW_FIRST_CARDS_PER_COLUMN),
  };
};

const toBands = (
  cells: readonly LocalPageCell<PageRow>[],
  input: ClientViewInput,
  configuration: PageViewConfiguration,
): readonly PageViewBand[] => {
  const bandProperty = input.properties.find((candidate) => candidate.key === configuration.subGroupBy);
  const bandKeys = [...new Set(cells.map((cell) => cell.subKey ?? UNASSIGNED_GROUP_KEY))];
  return bandKeys.map((bandKey) => ({
    ...describeGroupKey(bandProperty, PAGE_GROUP_BY_MODE.OPTION, bandKey, input.statusGroupLabel),
    groups: cells
      .filter((cell) => (cell.subKey ?? UNASSIGNED_GROUP_KEY) === bandKey)
      .map((cell) => toGroup({ ...cell, subKey: bandKey }, input, configuration)),
    key: bandKey,
  }));
};

const toOutcome = (bands: readonly PageViewBand[], isBanded: boolean): PageViewOutcome =>
  isBanded ? { bands, kind: 'BANDED_ROWS' } : { groups: bands.flatMap((band) => band.groups), kind: 'GROUPED_ROWS' };

const toGroupedReading = (
  cells: readonly LocalPageCell<PageRow>[],
  input: ClientViewInput,
  configuration: PageViewConfiguration,
): Pick<ClientViewReading, 'bands' | 'outcome'> => {
  const isBanded = configuration.subGroupBy !== null;
  const bands = isBanded
    ? toBands(cells, input, configuration)
    : [
        {
          color: null,
          groups: cells.map((cell) => toGroup(cell, input, configuration)),
          key: '',
          label: '',
        },
      ];
  return { bands, outcome: toOutcome(bands, isBanded) };
};

const readAggregates = (
  input: ClientViewInput,
  query: LocalPageQueryInput<PageRow>,
): ClientViewReading['aggregates'] => {
  const counts = buildViewCountsQuery(input.view);
  const answered = runLocalPageQuery({ ...query, request: { ...query.request, reducers: counts.reducers } });
  return answered.isOk() ? toViewAggregatesFromOutcome(answered.getValue()[PAGE_VIEW_COUNTS_REDUCER]) : null;
};

/**
 * A view drawn from the rows the browser holds, with the engine the server is tested against: the same groups, the
 * same order and the same counts, and no question to the server (ADR 029). A grouping only the server can make is
 * refused, and the view goes back to asking it.
 */
export const readClientView = (input: ClientViewInput): Result<ClientViewReading, LocalPageQueryRefusal> => {
  const configuration = readPageViewConfiguration(input.view.configuration);
  const query = toQuery(input);
  const isGrouped = readPageViewShape(input.view.type, configuration.groupBy) === PAGE_VIEW_SHAPE.GROUPED;
  const aggregates = readAggregates(input, query);
  if (!isGrouped) {
    const rows = listLocalPageRows(query);
    return rows.isFail()
      ? Result.fail(rows.getError())
      : Result.ok({ aggregates, ...toFlatReading(rows.getValue(), input) });
  }
  const cells = listLocalPageCells(query);
  if (cells.isFail()) return Result.fail(cells.getError());
  return Result.ok({ aggregates, ...toGroupedReading(cells.getValue().cells, input, configuration) });
};
