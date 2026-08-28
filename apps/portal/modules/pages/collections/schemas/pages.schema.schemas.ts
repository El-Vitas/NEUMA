import {
  PAGE_LIFECYCLE_VALUES,
  PAGE_OPTION_COLOR_VALUES,
  PAGE_PROPERTY_TYPE_VALUES,
  PAGE_VIEW_TYPE_VALUES,
} from '@company-brain/shared';
import { z } from 'zod';

export const pagePropertyTypeSchema = z.enum(PAGE_PROPERTY_TYPE_VALUES);

export const pagePropertyValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string()).readonly()]);

export const pagePropertyValuesSchema = z.record(z.string(), pagePropertyValueSchema);

export const pagePropertyOptionSchema = z.object({
  color: z.enum(PAGE_OPTION_COLOR_VALUES).nullable(),
  value: z.string(),
});

export const pageSchemaPropertySchema = z.object({
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

export const pageViewGroupSchema = z.object({
  color: z.enum(PAGE_OPTION_COLOR_VALUES).nullable(),
  key: z.string(),
  label: z.string(),
  rows: pageRowsSchema,
});

export const pageViewOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('FLAT_ROWS'), rows: pageRowsSchema }),
  z.object({ groups: z.array(pageViewGroupSchema), kind: z.literal('GROUPED_ROWS') }),
  z.object({ kind: z.literal('MISSING_GROUPING_PROPERTY') }),
]);
