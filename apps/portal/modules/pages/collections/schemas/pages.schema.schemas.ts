import {
  PAGE_LIFECYCLE_VALUES,
  PAGE_NUMBER_FORMAT_VALUES,
  PAGE_OPTION_COLOR_VALUES,
  PAGE_PROPERTY_TYPE_VALUES,
  PAGE_STATUS_GROUP_VALUES,
  PAGE_VIEW_TYPE_VALUES,
} from '@neuma/shared';
import { z } from 'zod';

export const pagePropertyTypeSchema = z.enum(PAGE_PROPERTY_TYPE_VALUES);

export const pageDateValueSchema = z.object({ end: z.string().optional(), start: z.string() });

export const pagePropertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()).readonly(),
  pageDateValueSchema,
]);

export const pagePropertyValuesSchema = z.record(z.string(), pagePropertyValueSchema);

export const pagePropertyOptionSchema = z.object({
  color: z.enum(PAGE_OPTION_COLOR_VALUES).nullable(),
  group: z.enum(PAGE_STATUS_GROUP_VALUES).nullable(),
  id: z.string(),
  value: z.string(),
});

export const pagePropertyConfigSchema = z.object({
  allowsMultiple: z.boolean(),
  currency: z.string().nullable(),
  decimals: z.number().nullable(),
  mirrorPropertyKey: z.string().nullable(),
  numberFormat: z.enum(PAGE_NUMBER_FORMAT_VALUES),
  prefix: z.string(),
  targetCollectionId: z.string().nullable(),
});

export const pageSchemaPropertySchema = z.object({
  config: pagePropertyConfigSchema,
  key: z.string(),
  label: z.string(),
  options: z.array(pagePropertyOptionSchema).nullable(),
  required: z.boolean(),
  type: pagePropertyTypeSchema,
});

export const pageViewTypeSchema = z.enum(PAGE_VIEW_TYPE_VALUES);

export const pageSchemaViewSchema = z.object({
  configuration: z.record(z.string(), z.unknown()),
  id: z.string(),
  isDefault: z.boolean(),
  name: z.string(),
  type: pageViewTypeSchema,
  version: z.number().int(),
});

export const pageSchemaSchema = z.object({
  pageId: z.string(),
  properties: z.array(pageSchemaPropertySchema),
  spaceId: z.string(),
  views: z.array(pageSchemaViewSchema),
});

export const pageRowSchema = z.object({
  id: z.string(),
  lifecycle: z.enum(PAGE_LIFECYCLE_VALUES),
  order: z.number(),
  parentId: z.string().nullable(),
  propertyValues: pagePropertyValuesSchema.nullable(),
  spaceId: z.string(),
  title: z.string(),
});

export const pageRowsSchema = z.array(pageRowSchema);

const pageQueryAggregateValueSchema = z.union([z.number(), z.string(), z.null()]);

const pageQueryOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({ ids: z.array(z.string()), kind: z.literal('results'), nextCursor: z.string().nullable() }),
  z.object({
    groups: z.array(
      z.object({
        ids: z.array(z.string()),
        isHidden: z.boolean(),
        key: z.string(),
        nextCursor: z.string().nullable(),
        subKey: z.string().nullable(),
      }),
    ),
    hasMoreGroups: z.boolean(),
    kind: z.literal('groups'),
  }),
  z.object({
    distinctRowCount: z.number().int(),
    groups: z.array(
      z.object({
        key: z.string(),
        subKey: z.string().nullable(),
        values: z.record(z.string(), pageQueryAggregateValueSchema),
      }),
    ),
    kind: z.literal('aggregations'),
    totals: z.record(z.string(), pageQueryAggregateValueSchema),
  }),
]);

/** What a view query answers (ADR 025): the outcome of each reducer by id, and one record per row they name. */
export const pageQueryResponseSchema = z.object({
  attachedFiles: z.array(z.object({ id: z.string(), mimeType: z.string(), name: z.string(), size: z.number() })),
  reducers: z.record(z.string(), pageQueryOutcomeSchema),
  relatedRows: z.array(z.object({ id: z.string(), title: z.string() })),
  rows: z.record(z.string(), pageRowSchema),
  spaceId: z.string(),
  viewVersion: z.number().int().nullable(),
});

export const pageChangedViewSchema = z.object({
  configuration: z.record(z.string(), z.unknown()),
  id: z.string(),
  version: z.number().int(),
});

export const pageSpaceCollectionsResponseSchema = z.array(z.object({ id: z.string(), title: z.string() }));

export const pageTransactionsResponseSchema = z.object({
  transactions: z.array(
    z.object({
      error: z.object({ code: z.string(), message: z.string() }).optional(),
      id: z.string(),
    }),
  ),
});
