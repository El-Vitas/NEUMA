import { PAGE_LIFECYCLE_VALUES, pageContentSchema as sharedPageContentSchema } from '@company-brain/shared';
import { z } from 'zod';
import { pageCoverValueSchema } from '../appearance/schemas/pages.cover.schemas';
import { pageIconSchema } from '../appearance/schemas/pages.icon.schemas';
import { pagePropertyValuesSchema } from '../collections/schemas/pages.schema.schemas';

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

/**
 * The id of a page, a space or a person. Every one is a uuid, and it ends up
 * written into the address of a request to the backend: anything else — a
 * `../` included — is turned away here, before it is asked of anyone.
 */
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
  /** Where the page is going. Left out, it stays in the space it is already in. */
  targetSpaceId: recordIdSchema.optional(),
});

export const pageReorderSchema = z.object({
  /** Left out, the page goes last among its sisters. */
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

/** Lo que dice una página, entero, para reemplazar lo que decía. */
export const pageContentReplacementSchema = pageBlocksHandoverSchema;

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
