import { z } from 'zod';
import { pageAuthorSchema, pageContentSchema, pageLocatorSchema } from '../../schemas/pages.schemas';

const versionNumberSchema = z.number().int().positive();

export const pageVersionSummarySchema = z.object({
  author: pageAuthorSchema.nullable(),
  createdAt: z.coerce.date(),
  title: z.string(),
  version: versionNumberSchema,
});

export const pageVersionListingSchema = z.object({
  items: z.array(pageVersionSummarySchema),
  nextCursor: versionNumberSchema.nullable(),
});

export const pageVersionDocumentSchema = z.object({
  content: pageContentSchema,
  title: z.string(),
  version: versionNumberSchema,
});

export const pageVersionListInputSchema = pageLocatorSchema.extend({ cursor: versionNumberSchema.optional() });

export const pageVersionInputSchema = pageLocatorSchema.extend({ version: versionNumberSchema });
