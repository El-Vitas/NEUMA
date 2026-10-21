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
  isDefault: z.boolean(),
  name: z.string(),
  type: pageViewTypeSchema,
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

export const pageRelationCandidatesResponseSchema = z.object({
  rows: z.array(z.object({ id: z.string(), title: z.string() })),
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

export const pageViewGroupSchema = z.object({
  color: z.enum(PAGE_OPTION_COLOR_VALUES).nullable(),
  key: z.string(),
  label: z.string(),
  rows: pageRowsSchema,
});

export const pageViewBandSchema = z.object({
  color: z.enum(PAGE_OPTION_COLOR_VALUES).nullable(),
  groups: z.array(pageViewGroupSchema),
  key: z.string(),
  label: z.string(),
});

export const pageViewOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({ bands: z.array(pageViewBandSchema), kind: z.literal('BANDED_ROWS') }),
  z.object({ kind: z.literal('FLAT_ROWS'), rows: pageRowsSchema }),
  z.object({ groups: z.array(pageViewGroupSchema), kind: z.literal('GROUPED_ROWS') }),
  z.object({ kind: z.literal('MISSING_GROUPING_PROPERTY') }),
]);

/** Counts come from the server because only it sees all rows; the client receives just those the view lets through. */
export const pageViewReadingSchema = z.object({
  attachedFiles: z.array(z.object({ id: z.string(), mimeType: z.string(), name: z.string(), size: z.number() })),
  hasMore: z.boolean(),
  outcome: pageViewOutcomeSchema,
  relatedRows: z.array(z.object({ id: z.string(), title: z.string() })),
  rowCount: z.number().int().min(0),
  totalRowCount: z.number().int().min(0),
});
