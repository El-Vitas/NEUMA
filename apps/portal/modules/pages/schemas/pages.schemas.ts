import { PAGE_LIFECYCLE_VALUES, pageContentSchema as sharedPageContentSchema } from '@neuma/shared';
import { z } from 'zod';
import { SEARCH_MAX_QUERY_LENGTH } from '@/shared/constants/search.constants';
import { pageCoverValueSchema } from '../appearance/schemas/pages.cover.schemas';
import { pageIconSchema } from '../appearance/schemas/pages.icon.schemas';
import { pageComputedErrorsSchema, pagePropertyValuesSchema } from '../collections/schemas/pages.schema.schemas';

export const pageContentSchema = sharedPageContentSchema;

export const pageLifecycleSchema = z.enum(PAGE_LIFECYCLE_VALUES);

/** What a row opened on its own page adds to the list's answer: its formulas and rollups, computed for the reader. */
export const pageComputedValuesSchema = z.object({
  computedErrors: pageComputedErrorsSchema.optional(),
  propertyValues: pagePropertyValuesSchema.nullable(),
});

export const pageAuthorSchema = z.object({ id: z.string(), name: z.string() });

export const pageSummarySchema = z.object({
  canEdit: z.boolean(),
  content: pageContentSchema,
  cover: pageCoverValueSchema.nullable(),
  createdAt: z.coerce.date(),
  createdBy: pageAuthorSchema.nullable(),
  hasOwnPermissions: z.boolean(),
  icon: pageIconSchema.nullable().optional(),
  id: z.string(),
  lifecycle: pageLifecycleSchema,
  lockedAt: z.coerce.date().nullable(),
  order: z.number(),
  owner: pageAuthorSchema.nullable(),
  parentId: z.string().nullable(),
  propertyValues: pagePropertyValuesSchema.nullable(),
  spaceId: z.string(),
  title: z.string(),
  updatedAt: z.coerce.date(),
  updatedBy: pageAuthorSchema.nullable(),
  verificationExpiresAt: z.coerce.date().nullable(),
  verifiedAt: z.coerce.date().nullable(),
  verifiedBy: pageAuthorSchema.nullable(),
  version: z.number(),
});

/** Ids end up in backend request paths, so anything that is not a uuid (e.g. `../`) is rejected here. */
const recordIdSchema = z.uuid();

export const pageMutationSchema = z.object({
  content: pageContentSchema,
  /** What each column starts with when nothing else says; the template of the collection goes over it. */
  defaultValues: pagePropertyValuesSchema.optional(),
  /** The id the page takes, so a write kept and sent again makes the page once. */
  id: z.uuid().optional(),
  propertyValues: pagePropertyValuesSchema.nullable().optional(),
  spaceId: recordIdSchema,
  /** Omitted starts from the default template of the collection; null starts a blank row. */
  templateId: recordIdSchema.nullable().optional(),
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
  parentTitle: z.string().nullable(),
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

export const pageMoveDestinationsInputSchema = pageLocatorSchema.extend({
  /** What is being looked for; empty lists the top of each space. */
  query: z.string().trim().max(SEARCH_MAX_QUERY_LENGTH),
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
  exceptPageId: recordIdSchema.nullable(),
  /** What is being looked for; empty lists the top of the space. */
  query: z.string().trim().max(SEARCH_MAX_QUERY_LENGTH),
  spaceId: recordIdSchema,
});
