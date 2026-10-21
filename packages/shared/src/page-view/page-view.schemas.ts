import { z } from 'zod';
import type { PagePropertyValue } from '../page-property/page-property.types.js';
import type { PageFilter, PageViewConfiguration } from './page-view.types.js';
import {
  PAGE_CHART_KIND,
  PAGE_CHART_KIND_VALUES,
  PAGE_CHART_MEASURE,
  PAGE_CARD_SIZE,
  PAGE_CARD_SIZE_VALUES,
  PAGE_CHART_MEASURE_VALUES,
  PAGE_COLUMN_ALIGNMENT_VALUES,
  PAGE_DATE_BUCKET,
  PAGE_DATE_BUCKET_VALUES,
  PAGE_DATE_SCALE,
  PAGE_DATE_SCALE_VALUES,
  PAGE_FILTER_GROUP_OPERATOR,
  PAGE_FILTER_MAXIMUM_DEPTH,
  PAGE_FILTER_OPERATOR_VALUES,
  PAGE_GROUP_BY_MODE,
  PAGE_GROUP_BY_MODE_VALUES,
  PAGE_ROW_HEIGHT,
  PAGE_ROW_HEIGHT_VALUES,
  PAGE_SORT_DIRECTION_VALUES,
  PAGE_VIEW_CALCULATION_VALUES,
} from './page-view.types.js';

const maximumFilterConditions = 20;
const maximumSorts = 5;
const maximumVisibleProperties = 50;
const maximumPropertyKeyLength = 100;
const maximumFilterTextLength = 500;
const maximumFilterEntries = 50;
const maximumFilterNodeIdLength = 64;
const maximumHiddenGroups = 200;

/** One emoji, counting multi-character ones such as a flag or a family. */
const maximumIconLength = 16;
const maximumColumns = 200;
const maximumColumnLimit = 999;
const maximumColumnValueLength = 200;
/** Pixels: narrower is unreadable, wider no longer fits beside the other columns. */
const minimumColumnWidth = 80;
const maximumColumnWidth = 960;

export const propertyKeySchema = z.string().min(1).max(maximumPropertyKeyLength);

/** A column is identified by its value, which is not a property key. */
export const columnValueSchema = z.string().min(1).max(maximumColumnValueLength);

const maximumFilterMomentLength = 40;

/** A range of days compared with a date: a row matches when its own dates overlap it. */
const filterDateRangeSchema = z
  .object({
    end: z.string().min(1).max(maximumFilterMomentLength).optional(),
    start: z.string().min(1).max(maximumFilterMomentLength),
  })
  .strict();

const filterValueSchema: z.ZodType<PagePropertyValue> = z.union([
  z.string().max(maximumFilterTextLength),
  z.number(),
  z.boolean(),
  z.array(z.string().max(maximumFilterTextLength)).max(maximumFilterEntries),
  filterDateRangeSchema,
]);

const filterNodeIdSchema = z.string().min(1).max(maximumFilterNodeIdLength);

const filterConditionSchema = z
  .object({
    id: filterNodeIdSchema.optional(),
    kind: z.literal('CONDITION'),
    operator: z.enum(PAGE_FILTER_OPERATOR_VALUES),
    propertyKey: propertyKeySchema,
    value: filterValueSchema.nullable(),
  })
  .strict();

const filterGroupSchema: z.ZodType<PageFilter> = z.lazy(() =>
  z
    .object({
      conditions: z.array(filterSchema).max(maximumFilterConditions),
      id: filterNodeIdSchema.optional(),
      kind: z.literal('GROUP'),
      operator: z.enum([PAGE_FILTER_GROUP_OPERATOR.AND, PAGE_FILTER_GROUP_OPERATOR.OR]),
    })
    .strict(),
);

const filterSchema: z.ZodType<PageFilter> = z.lazy(() => z.union([filterConditionSchema, filterGroupSchema]));

const countFilterDepth = (filter: PageFilter): number =>
  filter.kind === 'CONDITION' ? 1 : 1 + Math.max(0, ...filter.conditions.map(countFilterDepth));

export const rootFilterSchema = filterSchema.refine((filter) => countFilterDepth(filter) <= PAGE_FILTER_MAXIMUM_DEPTH, {
  message: 'Filter exceeds the maximum nesting depth',
});

export const sortSchema = z
  .object({
    direction: z.enum(PAGE_SORT_DIRECTION_VALUES),
    propertyKey: propertyKeySchema,
  })
  .strict();

const configurationShape = {
  calculations: z.record(propertyKeySchema, z.enum(PAGE_VIEW_CALCULATION_VALUES)).nullish(),
  chartKind: z.enum(PAGE_CHART_KIND_VALUES).nullish(),
  chartMeasure: z.enum(PAGE_CHART_MEASURE_VALUES).nullish(),
  chartValueProperty: propertyKeySchema.nullish(),
  collapsedGroups: z.array(columnValueSchema).max(maximumColumns).nullish(),
  columnLimits: z.record(columnValueSchema, z.number().int().min(1).max(maximumColumnLimit)).nullish(),
  columnAlignments: z.record(propertyKeySchema, z.enum(PAGE_COLUMN_ALIGNMENT_VALUES)).nullish(),
  columnWidths: z.record(propertyKeySchema, z.number().int().min(minimumColumnWidth).max(maximumColumnWidth)).nullish(),
  cardSize: z.enum(PAGE_CARD_SIZE_VALUES).nullish(),
  columnWraps: z.record(propertyKeySchema, z.literal(true)).nullish(),
  coverProperty: propertyKeySchema.nullish(),
  dateProperty: propertyKeySchema.nullish(),
  dateScale: z.enum(PAGE_DATE_SCALE_VALUES).nullish(),
  endDateProperty: propertyKeySchema.nullish(),
  filter: rootFilterSchema.nullish(),
  frozenColumns: z.number().int().min(0).max(maximumVisibleProperties).nullish(),
  hidesEmptyGroups: z.boolean().nullish(),
  icon: z.string().min(1).max(maximumIconLength).nullish(),
  rowHeight: z.enum(PAGE_ROW_HEIGHT_VALUES).nullish(),
  wrapsText: z.boolean().nullish(),
  hidesUnassignedColumn: z.boolean().nullish(),
  groupBy: propertyKeySchema.nullish(),
  groupByDateBucket: z.enum(PAGE_DATE_BUCKET_VALUES).nullish(),
  groupByMode: z.enum(PAGE_GROUP_BY_MODE_VALUES).nullish(),
  hiddenGroups: z.array(columnValueSchema).max(maximumHiddenGroups).nullish(),
  sorts: z.array(sortSchema).max(maximumSorts).optional(),
  subGroupBy: propertyKeySchema.nullish(),
  visibleProperties: z.array(propertyKeySchema).max(maximumVisibleProperties).nullish(),
};

export const pageViewConfigurationSchema = z.object(configurationShape).strict();

const storedConfigurationSchema = z.object(configurationShape);

const toConfiguration = (parsed: z.infer<typeof storedConfigurationSchema>): PageViewConfiguration => ({
  calculations: parsed.calculations ?? {},
  cardSize: parsed.cardSize ?? PAGE_CARD_SIZE.MEDIUM,
  chartKind: parsed.chartKind ?? PAGE_CHART_KIND.BAR,
  chartMeasure: parsed.chartMeasure ?? PAGE_CHART_MEASURE.COUNT,
  chartValueProperty: parsed.chartValueProperty ?? null,
  collapsedGroups: parsed.collapsedGroups ?? [],
  columnAlignments: parsed.columnAlignments ?? {},
  columnLimits: parsed.columnLimits ?? {},
  columnWidths: parsed.columnWidths ?? {},
  columnWraps: parsed.columnWraps ?? {},
  coverProperty: parsed.coverProperty ?? null,
  dateProperty: parsed.dateProperty ?? null,
  dateScale: parsed.dateScale ?? PAGE_DATE_SCALE.MONTH,
  endDateProperty: parsed.endDateProperty ?? null,
  filter: parsed.filter ?? null,
  frozenColumns: parsed.frozenColumns ?? 0,
  hidesEmptyGroups: parsed.hidesEmptyGroups ?? false,
  icon: parsed.icon ?? null,
  rowHeight: parsed.rowHeight ?? PAGE_ROW_HEIGHT.SHORT,
  wrapsText: parsed.wrapsText ?? false,
  hidesUnassignedColumn: parsed.hidesUnassignedColumn ?? false,
  groupBy: parsed.groupBy ?? null,
  groupByDateBucket: parsed.groupByDateBucket ?? PAGE_DATE_BUCKET.DAY,
  groupByMode: parsed.groupByMode ?? PAGE_GROUP_BY_MODE.OPTION,
  hiddenGroups: parsed.hiddenGroups ?? [],
  sorts: parsed.sorts ?? [],
  subGroupBy: parsed.subGroupBy ?? null,
  visibleProperties: parsed.visibleProperties ?? null,
});

export const EMPTY_PAGE_VIEW_CONFIGURATION: PageViewConfiguration = {
  calculations: {},
  cardSize: PAGE_CARD_SIZE.MEDIUM,
  chartKind: PAGE_CHART_KIND.BAR,
  chartMeasure: PAGE_CHART_MEASURE.COUNT,
  chartValueProperty: null,
  collapsedGroups: [],
  columnAlignments: {},
  columnLimits: {},
  columnWidths: {},
  columnWraps: {},
  coverProperty: null,
  dateProperty: null,
  dateScale: PAGE_DATE_SCALE.MONTH,
  endDateProperty: null,
  filter: null,
  frozenColumns: 0,
  hidesEmptyGroups: false,
  hidesUnassignedColumn: false,
  icon: null,
  rowHeight: PAGE_ROW_HEIGHT.SHORT,
  wrapsText: false,
  groupBy: null,
  groupByDateBucket: PAGE_DATE_BUCKET.DAY,
  groupByMode: PAGE_GROUP_BY_MODE.OPTION,
  hiddenGroups: [],
  sorts: [],
  subGroupBy: null,
  visibleProperties: null,
};

export const readPageViewConfiguration = (value: unknown): PageViewConfiguration => {
  const parsed = storedConfigurationSchema.safeParse(value);
  return parsed.success ? toConfiguration(parsed.data) : EMPTY_PAGE_VIEW_CONFIGURATION;
};
