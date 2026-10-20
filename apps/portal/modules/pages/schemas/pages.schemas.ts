import { PAGE_LIFECYCLE_VALUES, pageContentSchema as sharedPageContentSchema } from '@neuma/shared';
import { z } from 'zod';
import { pageCoverValueSchema } from '../appearance/schemas/pages.cover.schemas';
import { pageIconSchema } from '../appearance/schemas/pages.icon.schemas';
import { pagePropertyValuesSchema } from '../collections/schemas/pages.schema.schemas';

export const pageContentSchema = sharedPageContentSchema;

export const pageLifecycleSchema = z.enum(PAGE_LIFECYCLE_VALUES);

export const pageAuthorSchema = z.object({ id: z.string(), name: z.string() });

/** Fields an older answer lacks, or that this version cannot read, fall back to null rather than failing the page. */
export const pageSummarySchema = z.object({
  content: pageContentSchema,
  cover: pageCoverValueSchema.nullable().catch(null).default(null),
  createdAt: z.coerce.date(),
  createdBy: pageAuthorSchema.nullable(),
  icon: pageIconSchema.nullable().optional(),
  id: z.string(),
  lifecycle: pageLifecycleSchema,
  lockedAt: z.coerce.date().nullable().catch(null).default(null),
  order: z.number(),
  owner: pageAuthorSchema.nullable().catch(null).default(null),
  parentId: z.string().nullable(),
  propertyValues: pagePropertyValuesSchema.nullable(),
  spaceId: z.string(),
  title: z.string(),
  updatedAt: z.coerce.date(),
  updatedBy: pageAuthorSchema.nullable(),
  verificationExpiresAt: z.coerce.date().nullable().catch(null).default(null),
  verifiedAt: z.coerce.date().nullable().catch(null).default(null),
  verifiedBy: pageAuthorSchema.nullable().catch(null).default(null),
  version: z.number(),
});

/** Ids end up in backend request paths, so anything that is not a uuid (e.g. `../`) is rejected here. */
const recordIdSchema = z.uuid();

export const pageMutationSchema = z.object({
  content: pageContentSchema,
  propertyValues: pagePropertyValuesSchema.nullable().optional(),
  spaceId: recordIdSchema,
  title: z.string().trim().max(200),
});

export const pageMoveSchema = z.object({
  pageId: recordIdSchema,
  parentId: recordIdSchema.nullable(),
  spaceId: recordIdSchema,
  targetSpaceId: recordIdSchema.optional(),
});

export const pageReorderSchema = z.object({
  beforePageId: recordIdSchema.optional(),
  pageId: recordIdSchema,
  spaceId: recordIdSchema,
});

export const pageLocationSchema = z.object({ spaceId: recordIdSchema });

export const pageMoveDestinationsSchema = z.object({
  pages: z.array(z.object({ id: z.string(), spaceId: z.string(), title: z.string() })),
  spaces: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const pageBlocksHandoverSchema = z.object({
  content: pageContentSchema,
  pageId: recordIdSchema,
  spaceId: recordIdSchema,
});

export const pageLocatorSchema = z.object({
  pageId: recordIdSchema,
  spaceId: recordIdSchema,
});

export const pageRenameSchema = pageLocatorSchema.extend({
  title: z.string().trim().max(200),
});

export const pageLockSchema = pageLocatorSchema.extend({ locked: z.boolean() });

export const pageVerificationSchema = pageLocatorSchema.extend({
  expiresAt: z.iso.datetime().nullable().optional(),
  verified: z.boolean(),
});

export const pageOwnerSchema = pageLocatorSchema.extend({ ownerId: recordIdSchema.nullable() });

export const pageDuplicateSchema = pageLocatorSchema.extend({
  includeChildren: z.boolean().optional(),
  title: z.string().trim().max(200),
});

export const pageRestoreMutationSchema = pageLocatorSchema.extend({
  includeChildren: z.boolean().optional(),
});

export const pageDestinationsSchema = z.object({
  exceptPageId: z.string().min(1).nullable(),
  spaceId: z.string().min(1),
});
