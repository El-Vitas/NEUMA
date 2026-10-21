import { PAGE_TEMPLATE_VARIABLE_VALUES } from '@neuma/shared';
import { z } from 'zod';
import { pagePropertyValuesSchema } from '../../collections/schemas/pages.schema.schemas';

const recordIdSchema = z.uuid();

export const pageTemplateSchema = z.object({
  id: z.string(),
  isDefault: z.boolean(),
  propertyValues: pagePropertyValuesSchema,
  title: z.string(),
  variables: z.record(z.string(), z.enum(PAGE_TEMPLATE_VARIABLE_VALUES)),
});

export const pageTemplateListingSchema = z.object({
  defaultTemplateId: z.string().nullable(),
  templates: z.array(pageTemplateSchema),
});

export const pageTemplateCreateSchema = z.object({
  collectionId: recordIdSchema,
  isDefault: z.boolean().optional(),
  spaceId: recordIdSchema,
  title: z.string().trim().min(1).max(200),
});

export const pageTemplateUpdateSchema = z.object({
  collectionId: recordIdSchema,
  spaceId: recordIdSchema,
  templateId: recordIdSchema,
  title: z.string().trim().min(1).max(200).optional(),
  variables: z.record(z.string(), z.enum(PAGE_TEMPLATE_VARIABLE_VALUES)).optional(),
});

export const pageTemplateDeleteSchema = z.object({
  collectionId: recordIdSchema,
  spaceId: recordIdSchema,
  templateId: recordIdSchema,
});

export const pageTemplateDefaultSchema = z.object({
  collectionId: recordIdSchema,
  spaceId: recordIdSchema,
  templateId: recordIdSchema.nullable(),
});

export const pageTemplateReadSchema = z.object({ collectionId: recordIdSchema, spaceId: recordIdSchema });
