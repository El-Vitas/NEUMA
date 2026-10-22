import { PAGE_LIFECYCLE_VALUES } from '@neuma/shared';
import { z } from 'zod';
import { pageIconSchema } from '../../appearance/schemas/pages.icon.schemas';
import { pageContentSchema } from '../../schemas/pages.schemas';
import { PAGE_TREE_MAX_BATCH_WINDOWS } from '../constants/pages.tree.constants';

const lifecycleSchema = z.enum(PAGE_LIFECYCLE_VALUES);

/** An icon this version cannot read is no icon, so the tree still draws the page. */
const iconSchema = pageIconSchema.nullable().catch(null);

export const pageTreeEntrySchema = z.object({
  hasChildren: z.boolean(),
  hasOwnPermissions: z.boolean(),
  icon: iconSchema,
  id: z.string(),
  isCollection: z.boolean(),
  lifecycle: lifecycleSchema,
  order: z.number(),
  parentId: z.string().nullable(),
  title: z.string(),
  version: z.number(),
});

export const pageTreeChildrenSchema = z.object({
  entries: z.array(pageTreeEntrySchema),
  total: z.number().int().min(0),
  watermark: z.string().optional(),
});

const pageTreeLevelSchema = pageTreeChildrenSchema.extend({
  parentId: z.string().nullable(),
  skip: z.number().int().min(0),
});

const pageTreeAncestorSchema = z.discriminatedUnion('isReadable', [
  z.object({
    icon: iconSchema,
    id: z.string(),
    isReadable: z.literal(true),
    lifecycle: lifecycleSchema,
    title: z.string(),
  }),
  z.object({
    icon: z.null(),
    id: z.null(),
    isReadable: z.literal(false),
    lifecycle: z.null(),
    title: z.null(),
  }),
]);

export const pageTreeAncestorsSchema = z.object({ ancestors: z.array(pageTreeAncestorSchema) });

export const pageTreePathSchema = z.object({
  ancestors: z.array(pageTreeAncestorSchema),
  levels: z.array(pageTreeLevelSchema),
  page: pageTreeEntrySchema,
});

const pageLookupEntrySchema = z.object({
  icon: iconSchema,
  id: z.string(),
  lifecycle: lifecycleSchema,
  spaceId: z.string(),
  title: z.string(),
  version: z.number(),
});

export const pageLookupSchema = z.object({ pages: z.array(pageLookupEntrySchema) });

export const pageLookupContentSchema = z.object({
  pages: z.array(z.object({ content: pageContentSchema, id: z.string(), spaceId: z.string(), title: z.string() })),
});

export const pageRecentSchema = z.object({
  entries: z.array(
    z.object({
      icon: iconSchema,
      id: z.string(),
      title: z.string(),
      updatedAt: z.coerce.date(),
      updatedByName: z.string().nullable(),
    }),
  ),
});

/** The messages of the live channel that a sidebar follows; anything else is not for it. */
export const pageTreeLiveMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('pong') }),
  z.object({ spaceId: z.string(), type: z.literal('subscribed-tree') }),
  z.object({ parentIds: z.array(z.string().nullable()), spaceId: z.string(), type: z.literal('tree-changed') }),
  z.object({ spaceId: z.string(), type: z.literal('tree-resync') }),
  z.object({ code: z.string(), spaceId: z.string().optional(), type: z.literal('error') }),
]);

/** Ids end up in backend request paths, so anything that is not a uuid (e.g. `../`) is rejected here. */
const recordIdSchema = z.uuid();

export const pageTreeWindowRequestSchema = z.object({
  parentId: recordIdSchema.nullable(),
  skip: z.number().int().min(0),
  take: z.number().int().min(1),
});

export const pageTreeWindowsInputSchema = z.object({
  requests: z.array(pageTreeWindowRequestSchema).min(1).max(PAGE_TREE_MAX_BATCH_WINDOWS),
  spaceId: recordIdSchema,
});
