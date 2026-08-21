import { PAGE_LIFECYCLE_VALUES, pageContentSchema as sharedPageContentSchema } from '@company-brain/shared';
import { z } from 'zod';
import { pageCoverValueSchema } from './pages.cover.schemas';
import { pageIconSchema } from './pages.icon.schemas';
import { pagePropertyValuesSchema } from './pages.schema.schemas';

export const pageContentSchema = sharedPageContentSchema;

export const pageLifecycleSchema = z.enum(PAGE_LIFECYCLE_VALUES);

export const pageAuthorSchema = z.object({ id: z.string(), name: z.string() });

export const pageSummarySchema = z.object({
  content: pageContentSchema,
  /** A stored cover this version cannot read leaves the page bare rather than unreadable. */
  cover: pageCoverValueSchema.nullable().catch(null).default(null),
  createdAt: z.coerce.date(),
  createdBy: pageAuthorSchema.nullable(),
  icon: pageIconSchema.nullable().optional(),
  id: z.string(),
  lifecycle: pageLifecycleSchema,
  /** An older answer that does not mention the lock reads as a page nobody locked. */
  lockedAt: z.coerce.date().nullable().catch(null).default(null),
  order: z.number(),
  /** An older answer that does not mention an owner reads as a page nobody was handed. */
  owner: pageAuthorSchema.nullable().catch(null).default(null),
  parentId: z.string().nullable(),
  propertyValues: pagePropertyValuesSchema.nullable(),
  spaceId: z.string(),
  title: z.string(),
  updatedAt: z.coerce.date(),
  updatedBy: pageAuthorSchema.nullable(),
  /** An older answer that does not mention verification reads as a page nobody has vouched for. */
  verificationExpiresAt: z.coerce.date().nullable().catch(null).default(null),
  verifiedAt: z.coerce.date().nullable().catch(null).default(null),
  verifiedBy: pageAuthorSchema.nullable().catch(null).default(null),
  version: z.number(),
});

export const pagesListSchema = z.array(pageSummarySchema);

export const pageMutationSchema = z.object({
  content: pageContentSchema,
  propertyValues: pagePropertyValuesSchema.nullable().optional(),
  spaceId: z.string().min(1),
  title: z.string().trim().max(200),
});

export const pageMoveSchema = z.object({
  pageId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  spaceId: z.string().min(1),
  /** Where the page is going. Left out, it stays in the space it is already in. */
  targetSpaceId: z.string().min(1).optional(),
});

export const pageReorderSchema = z.object({
  /** Left out, the page goes last among its sisters. */
  beforePageId: z.string().min(1).optional(),
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});

export const pageLocationSchema = z.object({ spaceId: z.string().min(1) });

export const pageMoveDestinationsSchema = z.object({
  pages: z.array(z.object({ id: z.string(), spaceId: z.string(), title: z.string() })),
  spaces: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const pageBlocksHandoverSchema = z.object({
  content: pageContentSchema,
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});

export const pageLocatorSchema = z.object({
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});

export const pageRenameSchema = pageLocatorSchema.extend({
  title: z.string().trim().max(200),
});

export const pageLockSchema = pageLocatorSchema.extend({ locked: z.boolean() });

export const pageVerificationSchema = pageLocatorSchema.extend({
  expiresAt: z.string().nullable().optional(),
  verified: z.boolean(),
});

export const pageOwnerSchema = pageLocatorSchema.extend({ ownerId: z.string().nullable() });

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
