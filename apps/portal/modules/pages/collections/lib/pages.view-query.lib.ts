import type {
  PageFilter,
  PageQueryAggregationItem,
  PageQueryReducer,
  PageQueryRequest,
  PageViewConfiguration,
} from '@neuma/shared';
import {
  PAGE_CHART_MEASURE,
  PAGE_VIEW_CALCULATION,
  PAGE_VIEW_SHAPE,
  PAGE_VIEW_TYPE,
  readPageViewConfiguration,
  readPageViewShape,
} from '@neuma/shared';
import {
  PAGE_VIEW_CALENDAR_ROWS,
  PAGE_VIEW_COUNT_ITEM,
  PAGE_VIEW_COUNTS_REDUCER,
  PAGE_VIEW_FIRST_CARDS_PER_COLUMN,
  PAGE_VIEW_FIRST_ROWS,
  PAGE_VIEW_ROWS_REDUCER,
} from '../constants/pages.query.constants';
import type { PageSchemaViewDraft } from '../types/pages.schema.types';
import { toCalculationItemId } from './pages.query-aggregates.lib';

/** The words typed to find rows, which the server matches in the title and the text answers of every row. */
export const toSearchPart = (search: string): { readonly search?: string } => {
  const words = search.trim();
  return words === '' ? {} : { search: words };
};

/** What narrows a view for whoever looks and is not saved in it: the words searched and the quick filter. */
export const toRefinementPart = (
  search: string,
  quickFilter: null | PageFilter | undefined,
): { readonly quickFilter?: PageFilter; readonly search?: string } => ({
  ...toSearchPart(search),
  ...(quickFilter === null || quickFilter === undefined ? {} : { quickFilter }),
});

/** A row must pass both: what the person filtered by and what the screen needs (the days of a calendar grid). */
export const andQuickFilters = (own: null | PageFilter, other: PageFilter): PageFilter =>
  own === null ? other : { conditions: [own, other], kind: 'GROUP', operator: 'AND' };

const rowsReducerOf = (view: PageSchemaViewDraft, configuration: PageViewConfiguration): PageQueryReducer => {
  if (view.type === PAGE_VIEW_TYPE.CALENDAR) {
    return { id: PAGE_VIEW_ROWS_REDUCER, kind: 'results', limit: PAGE_VIEW_CALENDAR_ROWS };
  }
  if (readPageViewShape(view.type, configuration.groupBy) === PAGE_VIEW_SHAPE.GROUPED) {
    return { id: PAGE_VIEW_ROWS_REDUCER, kind: 'groups', rowsPerGroup: PAGE_VIEW_FIRST_CARDS_PER_COLUMN };
  }
  return { id: PAGE_VIEW_ROWS_REDUCER, kind: 'results', limit: PAGE_VIEW_FIRST_ROWS };
};

/** The first phase of a view: the rows it shows at first, without counting anything. A chart draws counts, not rows. */
export const buildViewRowsQuery = (
  view: PageSchemaViewDraft & { readonly id: string },
  search = '',
  quickFilter: null | PageFilter = null,
): PageQueryRequest => {
  const configuration = readPageViewConfiguration(view.configuration);
  return {
    reducers: view.type === PAGE_VIEW_TYPE.CHART ? [] : [rowsReducerOf(view, configuration)],
    ...toRefinementPart(search, quickFilter),
    viewId: view.id,
  };
};

const chartItemsOf = (configuration: PageViewConfiguration): readonly PageQueryAggregationItem[] => {
  if (configuration.chartMeasure === PAGE_CHART_MEASURE.COUNT || configuration.chartValueProperty === null) return [];
  const calculation =
    configuration.chartMeasure === PAGE_CHART_MEASURE.SUM ? PAGE_VIEW_CALCULATION.SUM : PAGE_VIEW_CALCULATION.AVERAGE;
  return [
    {
      calculation,
      id: toCalculationItemId(configuration.chartValueProperty, calculation),
      propertyKey: configuration.chartValueProperty,
    },
  ];
};

const calculationItemsOf = (configuration: PageViewConfiguration): readonly PageQueryAggregationItem[] =>
  Object.entries(configuration.calculations)
    .filter(([, calculation]) => calculation !== PAGE_VIEW_CALCULATION.NONE)
    .map(([propertyKey, calculation]) => ({
      calculation,
      id: toCalculationItemId(propertyKey, calculation),
      propertyKey,
    }));

/**
 * The second phase: how many rows there are, in each group, and what the calculations of the columns say. It is a
 * separate request so the rows can be drawn before the database has finished counting them.
 */
export const buildViewCountsQuery = (
  view: PageSchemaViewDraft & { readonly id: string },
  search = '',
  quickFilter: null | PageFilter = null,
): PageQueryRequest => {
  const configuration = readPageViewConfiguration(view.configuration);
  const items: readonly PageQueryAggregationItem[] = [
    { calculation: PAGE_VIEW_CALCULATION.COUNT_ALL, id: PAGE_VIEW_COUNT_ITEM, propertyKey: null },
    ...(view.type === PAGE_VIEW_TYPE.CHART ? chartItemsOf(configuration) : calculationItemsOf(configuration)),
  ];
  const isGrouped = readPageViewShape(view.type, configuration.groupBy) === PAGE_VIEW_SHAPE.GROUPED;
  return {
    reducers: [
      { by: isGrouped ? 'GROUP' : 'NONE', id: PAGE_VIEW_COUNTS_REDUCER, items: [...items], kind: 'aggregations' },
    ],
    ...toRefinementPart(search, quickFilter),
    viewId: view.id,
  };
};
