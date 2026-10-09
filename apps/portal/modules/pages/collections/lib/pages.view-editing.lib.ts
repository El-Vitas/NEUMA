import type { PageChartKind, PageChartMeasure, PageDateBucket, PageViewType } from '@company-brain/shared';
import {
  canPagePropertyGroupBoard,
  PAGE_CHART_KIND,
  PAGE_CHART_KIND_VALUES,
  PAGE_CHART_MEASURE,
  PAGE_CHART_MEASURE_VALUES,
  PAGE_DATE_BUCKET,
  PAGE_DATE_BUCKET_VALUES,
  PAGE_VIEW_OUTCOME_KIND,
  PAGE_VIEW_TYPE_VALUES,
  pageViewRequiresGrouping,
  readPageViewConfiguration,
  readVisiblePropertyKeys,
} from '@company-brain/shared';
import type {
  PageSchemaProperty,
  PageSchemaView,
  PageViewBand,
  PageViewBandedOutcome,
  PageViewFlatOutcome,
  PageViewGroup,
  PageViewGroupedOutcome,
} from '../types/pages.schema.types';

/** Narrows a select's plain string by lookup instead of a cast. */
export const readPageViewType = (chosen: string): PageViewType | undefined =>
  PAGE_VIEW_TYPE_VALUES.find((candidate) => candidate === chosen);

export const readPageDateBucket = (chosen: string): PageDateBucket =>
  PAGE_DATE_BUCKET_VALUES.find((candidate) => candidate === chosen) ?? PAGE_DATE_BUCKET.DAY;

export const readPageChartKind = (chosen: string): PageChartKind =>
  PAGE_CHART_KIND_VALUES.find((candidate) => candidate === chosen) ?? PAGE_CHART_KIND.BAR;

export const readPageChartMeasure = (chosen: string): PageChartMeasure =>
  PAGE_CHART_MEASURE_VALUES.find((candidate) => candidate === chosen) ?? PAGE_CHART_MEASURE.COUNT;

/** Only closed lists of values: a date would make a column per day, free text a column per answer. */
export const listGroupablePropertyKeys = (properties: readonly PageSchemaProperty[]): readonly string[] =>
  properties.filter((property) => canPagePropertyGroupBoard(property.type)).map((property) => property.key);

/**
 * Found client-side so the problem can be reported while configuring; the server would reject the whole
 * collection. Also matches a board grouped by a property that was removed or is no longer a select.
 */
export const findBoardWithoutGrouping = (
  views: readonly PageSchemaView[],
  properties: readonly PageSchemaProperty[],
): PageSchemaView | undefined => {
  const groupable = listGroupablePropertyKeys(properties);
  return views.find(
    (view) =>
      pageViewRequiresGrouping(view.type) &&
      !groupable.includes(readPageViewConfiguration(view.configuration).groupBy ?? ''),
  );
};

/** A board without a sub-grouping is a grid with one unnamed band, so columns are rendered by one code path. */
export const readBoardBands = (outcome: PageViewBandedOutcome | PageViewGroupedOutcome): readonly PageViewBand[] =>
  outcome.kind === PAGE_VIEW_OUTCOME_KIND.BANDED_ROWS
    ? outcome.bands
    : [{ color: null, groups: outcome.groups, key: '', label: '' }];

/** Ungrouped rows become one unnamed group so table, list and gallery render through a single path. */
export const readViewGroups = (outcome: PageViewFlatOutcome | PageViewGroupedOutcome): readonly PageViewGroup[] =>
  outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS
    ? outcome.groups
    : [{ color: null, key: '', label: '', rows: outcome.rows }];

const rewriteView = (
  views: readonly PageSchemaView[],
  viewName: string,
  rewrite: (configuration: PageSchemaView['configuration']) => PageSchemaView['configuration'],
): readonly PageSchemaView[] =>
  views.map((view) => (view.name === viewName ? { ...view, configuration: rewrite(view.configuration) } : view));

/** Removing the grouping also removes the bands: crossing an ungrouped view means nothing. */
export const setViewGroupBy = (
  views: readonly PageSchemaView[],
  viewName: string,
  groupBy: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...readPageViewConfiguration(configuration),
    groupBy,
    ...(groupBy === null ? { subGroupBy: null } : {}),
  }));

/** The grouping property cannot also be the band: each band would have a single filled cell. */
export const setViewSubGroupBy = (
  views: readonly PageSchemaView[],
  viewName: string,
  subGroupBy: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => {
    const current = readPageViewConfiguration(configuration);
    return { ...current, subGroupBy: subGroupBy === current.groupBy ? null : subGroupBy };
  });

export const setViewDateBucket = (
  views: readonly PageSchemaView[],
  viewName: string,
  groupByDateBucket: PageDateBucket,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...readPageViewConfiguration(configuration),
    groupByDateBucket,
  }));

export const setViewDateProperty = (
  views: readonly PageSchemaView[],
  viewName: string,
  dateProperty: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...readPageViewConfiguration(configuration), dateProperty }));

export const setViewChartKind = (
  views: readonly PageSchemaView[],
  viewName: string,
  chartKind: PageChartKind,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...readPageViewConfiguration(configuration), chartKind }));

/** Set together: counting needs no property, summing needs one. Choosing count clears the stale property. */
export const setViewChartMeasure = (
  views: readonly PageSchemaView[],
  viewName: string,
  chartMeasure: PageChartMeasure,
  chartValueProperty: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...readPageViewConfiguration(configuration),
    chartMeasure,
    chartValueProperty: chartMeasure === PAGE_CHART_MEASURE.COUNT ? null : chartValueProperty,
  }));

export const setViewIcon = (
  views: readonly PageSchemaView[],
  viewName: string,
  icon: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...readPageViewConfiguration(configuration), icon }));

/** A view that never chose shows everything, so the first toggle must write all keys except the clicked one. */
export const toggleViewProperty = (
  views: readonly PageSchemaView[],
  viewName: string,
  propertyKey: string,
  availableKeys: readonly string[],
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => {
    const current = readPageViewConfiguration(configuration);
    const shown = readVisiblePropertyKeys(current.visibleProperties, availableKeys);
    const visibleProperties = shown.includes(propertyKey)
      ? shown.filter((key) => key !== propertyKey)
      : [...shown, propertyKey];
    return { ...current, visibleProperties: [...visibleProperties] };
  });
