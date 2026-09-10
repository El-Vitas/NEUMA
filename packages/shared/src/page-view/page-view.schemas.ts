import { z } from 'zod';
import type { PagePropertyValue } from '../page-property/page-property.types.js';
import type { PageFilter, PageViewConfiguration } from './page-view.types.js';
import {
  PAGE_FILTER_GROUP_OPERATOR,
  PAGE_FILTER_OPERATOR_VALUES,
  PAGE_SORT_DIRECTION_VALUES,
} from './page-view.types.js';

const maximumFilterDepth = 3;
const maximumFilterConditions = 20;
const maximumSorts = 5;
const maximumVisibleProperties = 50;
const maximumPropertyKeyLength = 100;
const maximumFilterTextLength = 500;
const maximumFilterEntries = 50;

const propertyKeySchema = z.string().min(1).max(maximumPropertyKeyLength);

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

const rootFilterSchema = filterSchema.refine((filter) => countFilterDepth(filter) <= maximumFilterDepth, {
  message: 'Filter exceeds the maximum nesting depth',
});

const sortSchema = z
  .object({
    direction: z.enum(PAGE_SORT_DIRECTION_VALUES),
    propertyKey: propertyKeySchema,
  })
  .strict();

const configurationShape = {
  filter: rootFilterSchema.nullish(),
  groupBy: propertyKeySchema.nullish(),
  sorts: z.array(sortSchema).max(maximumSorts).optional(),
  subGroupBy: propertyKeySchema.nullish(),
  visibleProperties: z.array(propertyKeySchema).max(maximumVisibleProperties).nullish(),
};

export const pageViewConfigurationSchema = z.object(configurationShape).strict();

const storedConfigurationSchema = z.object(configurationShape);

const toConfiguration = (parsed: z.infer<typeof storedConfigurationSchema>): PageViewConfiguration => ({
  filter: parsed.filter ?? null,
  groupBy: parsed.groupBy ?? null,
  sorts: parsed.sorts ?? [],
  subGroupBy: parsed.subGroupBy ?? null,
  /** Nothing means «all of them»; an empty list means somebody chose to show none. */
  visibleProperties: parsed.visibleProperties ?? null,
});

export const EMPTY_PAGE_VIEW_CONFIGURATION: PageViewConfiguration = {
  filter: null,
  groupBy: null,
  sorts: [],
  subGroupBy: null,
  visibleProperties: null,
};

export const readPageViewConfiguration = (value: unknown): PageViewConfiguration => {
  const parsed = storedConfigurationSchema.safeParse(value);
  return parsed.success ? toConfiguration(parsed.data) : EMPTY_PAGE_VIEW_CONFIGURATION;
};
