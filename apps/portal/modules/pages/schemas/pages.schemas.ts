import { PAGE_LIFECYCLE_VALUES, pageContentSchema as sharedPageContentSchema } from '@company-brain/shared';
import { z } from 'zod';
import { pagePropertyValuesSchema } from './pages.schema.schemas';

export const pageContentSchema = sharedPageContentSchema;

export const pageLifecycleSchema = z.enum(PAGE_LIFECYCLE_VALUES);

export const pageSummarySchema = z.object({
  content: pageContentSchema,
  id: z.string(),
  lifecycle: pageLifecycleSchema,
  order: z.number(),
  parentId: z.string().nullable(),
  propertyValues: pagePropertyValuesSchema.nullable(),
  spaceId: z.string(),
  title: z.string(),
  version: z.number(),
});

export const pagesListSchema = z.array(pageSummarySchema);

export const pageMutationSchema = z.object({
  content: pageContentSchema,
  propertyValues: pagePropertyValuesSchema.nullable().optional(),
  spaceId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
});

export const pageMoveSchema = z.object({
  pageId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  spaceId: z.string().min(1),
});

export const pageBlocksHandoverSchema = z.object({
  content: pageContentSchema,
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});

export const pageLifecycleMutationSchema = z.object({
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});

export const pageDestinationsSchema = z.object({
  exceptPageId: z.string().min(1).nullable(),
  spaceId: z.string().min(1),
});
