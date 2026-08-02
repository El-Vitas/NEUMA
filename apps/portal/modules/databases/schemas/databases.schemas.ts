import { z } from 'zod';

const databasePropertyTypeSchema = z.enum([
  'TITLE',
  'RICH_TEXT',
  'SELECT',
  'MULTI_SELECT',
  'PERSON',
  'DATE',
  'CHECKBOX',
  'NUMBER',
]);

const databasePropertyValueSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.array(z.string())]);

export const databasePropertySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  options: z.array(z.string()).nullable(),
  required: z.boolean(),
  type: databasePropertyTypeSchema,
});

export const databaseViewSchema = z.object({
  configuration: z.record(z.string(), z.unknown()),
  isDefault: z.boolean(),
  name: z.string().min(1),
  type: z.enum(['TABLE', 'BOARD']),
});

export const databaseRecordSchema = z.object({
  databaseId: z.string().min(1),
  id: z.string().min(1),
  lifecycle: z.enum(['ACTIVE', 'ARCHIVED']),
  order: z.number(),
  propertyValues: z.record(z.string(), databasePropertyValueSchema),
  title: z.string(),
});

export const databaseSummarySchema = z.object({
  id: z.string().min(1),
  lifecycle: z.enum(['ACTIVE', 'ARCHIVED']),
  name: z.string().min(1),
  properties: z.array(databasePropertySchema),
  slug: z.string().min(1),
  spaceId: z.string().min(1),
  template: z.enum(['TASKS', 'PROJECTS', 'CUSTOM']),
  views: z.array(databaseViewSchema),
  workspaceId: z.string().min(1),
});

export const databasesListSchema = z.array(databaseSummarySchema);
export const databaseRecordsSchema = z.array(databaseRecordSchema);

export const createDatabaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(80),
  spaceId: z.string().min(1),
  template: z.enum(['TASKS', 'PROJECTS']),
});

export const databaseRecordMutationSchema = z.object({
  databaseId: z.string().min(1),
  propertyValues: z.record(z.string(), databasePropertyValueSchema),
  recordId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(200),
});
