import { PAGE_PROPERTY_TYPE_VALUES, PAGE_VIEW_TYPE_VALUES, pageContentSchema } from '@company-brain/shared';
import { z } from 'zod';

const pageCollectionPropertySchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(200)).max(50).readonly().nullable(),
  required: z.boolean(),
  type: z.enum(PAGE_PROPERTY_TYPE_VALUES),
});

const pageCollectionViewSchema = z.object({
  configuration: z.record(z.string(), z.unknown()),
  isDefault: z.boolean(),
  name: z.string().min(1).max(200),
  type: z.enum(PAGE_VIEW_TYPE_VALUES),
});

/** What has to be said to start a collection: a page to keep it in, and the shape it starts with. */
export const pageCollectionCreateSchema = z.object({
  content: pageContentSchema,
  parentId: z.string().min(1),
  properties: z.array(pageCollectionPropertySchema).min(1).max(50).readonly(),
  spaceId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  views: z.array(pageCollectionViewSchema).min(1).max(20).readonly(),
});

/** What has to be said to ask whether a page already written is a collection. */
export const pageCollectionReadSchema = z.object({
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});
