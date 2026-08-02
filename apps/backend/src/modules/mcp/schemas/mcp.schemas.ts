import { PAGE_LIFECYCLE_VALUES, pageContentSchema, SPACE_VISIBILITY_VALUES } from '@company-brain/shared';
import { z } from 'zod';

const mcpSpaceSchema = z.object({
  id: z.string().max(128),
  name: z.string().max(200),
  slug: z.string().max(200),
  visibility: z.enum(SPACE_VISIBILITY_VALUES),
});

const mcpPageSchema = z.object({
  content: pageContentSchema,
  id: z.string().max(128),
  lifecycle: z.enum(PAGE_LIFECYCLE_VALUES),
  order: z.number().int().nonnegative(),
  parentId: z.string().max(128).nullable(),
  spaceId: z.string().max(128),
  title: z.string().max(200),
  version: z.number().int().positive(),
});

export const getPageInputSchema = z.object({
  pageId: z.uuid(),
});

export const getPageOutputSchema = z.object({
  page: mcpPageSchema,
});

export const listSpacesInputSchema = z.object({});

export const listSpacesOutputSchema = z.object({
  spaces: z.array(mcpSpaceSchema).max(1000),
});
