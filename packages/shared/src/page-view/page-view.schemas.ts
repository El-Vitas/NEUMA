import { z } from 'zod';
import type { PagePropertyValue } from '../page-property/page-property.types.js';
import type { PageFilter, PageViewConfiguration } from './page-view.types.js';
import {
  PAGE_CHART_KIND,
  PAGE_CHART_KIND_VALUES,
  PAGE_CHART_MEASURE,
  PAGE_CHART_MEASURE_VALUES,
  PAGE_COLUMN_ALIGNMENT_VALUES,
  PAGE_DATE_BUCKET,
  PAGE_DATE_BUCKET_VALUES,
  PAGE_FILTER_GROUP_OPERATOR,
  PAGE_FILTER_MAXIMUM_DEPTH,
  PAGE_FILTER_OPERATOR_VALUES,
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

/** Un emoji, contando los que se escriben con varios caracteres —una bandera, una familia—. */
const maximumIconLength = 16;
const maximumColumns = 200;
const maximumColumnLimit = 999;
const maximumColumnValueLength = 200;
/** Una columna más angosta que esto deja de poder leerse, y más ancha deja de caber con las demás. */
const minimumColumnWidth = 80;
const maximumColumnWidth = 960;

const propertyKeySchema = z.string().min(1).max(maximumPropertyKeyLength);

/** Una columna se nombra por el valor que es, y un valor no es una clave de propiedad. */
const columnValueSchema = z.string().min(1).max(maximumColumnValueLength);

const filterValueSchema: z.ZodType<PagePropertyValue> = z.union([
  z.string().max(maximumFilterTextLength),
  z.number(),
  z.boolean(),
  z.array(z.string().max(maximumFilterTextLength)).max(maximumFilterEntries),
]);

const filterConditionSchema = z
  .object({
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
      kind: z.literal('GROUP'),
      operator: z.enum([PAGE_FILTER_GROUP_OPERATOR.AND, PAGE_FILTER_GROUP_OPERATOR.OR]),
    })
    .strict(),
);

const filterSchema: z.ZodType<PageFilter> = z.lazy(() => z.union([filterConditionSchema, filterGroupSchema]));

const countFilterDepth = (filter: PageFilter): number =>
  filter.kind === 'CONDITION' ? 1 : 1 + Math.max(0, ...filter.conditions.map(countFilterDepth));

const rootFilterSchema = filterSchema.refine((filter) => countFilterDepth(filter) <= PAGE_FILTER_MAXIMUM_DEPTH, {
  message: 'Filter exceeds the maximum nesting depth',
});

const sortSchema = z
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
  dateProperty: propertyKeySchema.nullish(),
  filter: rootFilterSchema.nullish(),
  frozenColumns: z.number().int().min(0).max(maximumVisibleProperties).nullish(),
  hidesEmptyGroups: z.boolean().nullish(),
  icon: z.string().min(1).max(maximumIconLength).nullish(),
  rowHeight: z.enum(PAGE_ROW_HEIGHT_VALUES).nullish(),
  wrapsText: z.boolean().nullish(),
  hidesUnassignedColumn: z.boolean().nullish(),
  groupBy: propertyKeySchema.nullish(),
  groupByDateBucket: z.enum(PAGE_DATE_BUCKET_VALUES).nullish(),
  sorts: z.array(sortSchema).max(maximumSorts).optional(),
  subGroupBy: propertyKeySchema.nullish(),
  visibleProperties: z.array(propertyKeySchema).max(maximumVisibleProperties).nullish(),
};

export const pageViewConfigurationSchema = z.object(configurationShape).strict();

const storedConfigurationSchema = z.object(configurationShape);

const toConfiguration = (parsed: z.infer<typeof storedConfigurationSchema>): PageViewConfiguration => ({
  calculations: parsed.calculations ?? {},
  /** Barras sin decir nada: comparar cuánto hay en cada grupo es a lo que se viene. */
  chartKind: parsed.chartKind ?? PAGE_CHART_KIND.BAR,
  /** Y contando filas, que es lo único que se puede hacer sin elegir una propiedad. */
  chartMeasure: parsed.chartMeasure ?? PAGE_CHART_MEASURE.COUNT,
  chartValueProperty: parsed.chartValueProperty ?? null,
  collapsedGroups: parsed.collapsedGroups ?? [],
  columnAlignments: parsed.columnAlignments ?? {},
  columnLimits: parsed.columnLimits ?? {},
  columnWidths: parsed.columnWidths ?? {},
  dateProperty: parsed.dateProperty ?? null,
  filter: parsed.filter ?? null,
  frozenColumns: parsed.frozenColumns ?? 0,
  hidesEmptyGroups: parsed.hidesEmptyGroups ?? false,
  icon: parsed.icon ?? null,
  /** Corta por defecto: lo que casi siempre se viene a hacer es ver muchas filas de una vez. */
  rowHeight: parsed.rowHeight ?? PAGE_ROW_HEIGHT.SHORT,
  wrapsText: parsed.wrapsText ?? false,
  hidesUnassignedColumn: parsed.hidesUnassignedColumn ?? false,
  groupBy: parsed.groupBy ?? null,
  /** Sin decir nada, cada día es su propio grupo: es lo que hacía antes de que hubiera tramos. */
  groupByDateBucket: parsed.groupByDateBucket ?? PAGE_DATE_BUCKET.DAY,
  sorts: parsed.sorts ?? [],
  subGroupBy: parsed.subGroupBy ?? null,
  /** Nothing means «all of them»; an empty list means somebody chose to show none. */
  visibleProperties: parsed.visibleProperties ?? null,
});

export const EMPTY_PAGE_VIEW_CONFIGURATION: PageViewConfiguration = {
  calculations: {},
  chartKind: PAGE_CHART_KIND.BAR,
  chartMeasure: PAGE_CHART_MEASURE.COUNT,
  chartValueProperty: null,
  collapsedGroups: [],
  columnAlignments: {},
  columnLimits: {},
  columnWidths: {},
  dateProperty: null,
  filter: null,
  frozenColumns: 0,
  hidesEmptyGroups: false,
  hidesUnassignedColumn: false,
  icon: null,
  rowHeight: PAGE_ROW_HEIGHT.SHORT,
  wrapsText: false,
  groupBy: null,
  groupByDateBucket: PAGE_DATE_BUCKET.DAY,
  sorts: [],
  subGroupBy: null,
  visibleProperties: null,
};

export const readPageViewConfiguration = (value: unknown): PageViewConfiguration => {
  const parsed = storedConfigurationSchema.safeParse(value);
  return parsed.success ? toConfiguration(parsed.data) : EMPTY_PAGE_VIEW_CONFIGURATION;
};
