import {
  PAGE_OPTION_COLOR_VALUES,
  PAGE_PROPERTY_TYPE_VALUES,
  PAGE_STATUS_GROUP_VALUES,
  PAGE_VIEW_TYPE_VALUES,
  pageContentSchema,
} from '@neuma/shared';
import { z } from 'zod';
import { pagePropertyConfigSchema, pagePropertyValueSchema } from './pages.schema.schemas';

const pageCollectionOptionSchema = z.object({
  color: z.enum(PAGE_OPTION_COLOR_VALUES).nullable(),
  group: z.enum(PAGE_STATUS_GROUP_VALUES).nullable().optional(),
  id: z.string().min(1).max(40).nullable().optional(),
  value: z.string().min(1).max(200),
});

const pageCollectionPropertySchema = z.object({
  config: pagePropertyConfigSchema.optional(),
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  options: z.array(pageCollectionOptionSchema).max(50).readonly().nullable(),
  required: z.boolean(),
  twoWay: z.boolean().optional(),
  type: z.enum(PAGE_PROPERTY_TYPE_VALUES),
});

const pageCollectionViewSchema = z.object({
  configuration: z.record(z.string(), z.unknown()),
  isDefault: z.boolean(),
  name: z.string().min(1).max(200),
  type: z.enum(PAGE_VIEW_TYPE_VALUES),
});

export const pageCollectionCreateSchema = z.object({
  content: pageContentSchema,
  // Absent when created from the space root.
  parentId: z.string().min(1).optional(),
  properties: z.array(pageCollectionPropertySchema).min(1).max(50).readonly(),
  spaceId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  views: z.array(pageCollectionViewSchema).min(1).max(20).readonly(),
});

export const pageCollectionReadSchema = z.object({
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});

/** Only the properties that changed are sent. A `null` value clears the property. */
export const pageRowPropertiesSchema = z.object({
  pageId: z.string().min(1),
  propertyValues: z.record(z.string(), z.union([pagePropertyValueSchema, z.null()])),
  spaceId: z.string().min(1),
});

/** A relation cell changes one row at a time, so two people editing the same cell never overwrite each other. */
export const pageRowRelationChangeSchema = z.object({
  change: z.enum(['ADD', 'REMOVE']),
  propertyKey: z.string().min(1).max(80),
  rowId: z.string().min(1),
  spaceId: z.string().min(1),
  targetId: z.string().min(1),
});

export const pageRelationCandidatesSchema = z.object({
  collectionId: z.string().min(1),
  spaceId: z.string().min(1),
});

export const pageViewConfigurationUpdateSchema = z.object({
  // Passed through: the server validates what a configuration may hold.
  configuration: z.record(z.string(), z.unknown()),
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
  viewName: z.string().min(1).max(200),
});

/** The option is named by its id, since its name may change. A null `to` removes it. */
export const pageOptionRewriteSchema = z.object({
  optionId: z.string().min(1).max(40),
  pageId: z.string().min(1),
  propertyKey: z.string().min(1).max(80),
  spaceId: z.string().min(1),
  to: z.string().trim().min(1).max(120).nullable(),
});

/** The whole shape is sent: a removed property can only be expressed by its absence from the list. */
export const pageCollectionUpdateSchema = z.object({
  pageId: z.string().min(1),
  properties: z.array(pageCollectionPropertySchema).min(1).max(50).readonly(),
  spaceId: z.string().min(1),
  views: z.array(pageCollectionViewSchema).min(1).max(20).readonly(),
});
