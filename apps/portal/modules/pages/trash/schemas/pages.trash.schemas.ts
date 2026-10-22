import { z } from 'zod';
import { pageAuthorSchema } from '../../schemas/pages.schemas';

export const trashedPageSchema = z.object({
  deletedAt: z.coerce.date(),
  deletedBy: pageAuthorSchema.nullable(),
  id: z.string(),
  isTemplate: z.boolean().catch(false).default(false),
  parentId: z.string().nullable(),
  purgeAfter: z.coerce.date().nullable(),
  spaceId: z.string(),
  title: z.string(),
  trashedChildCount: z.number(),
});

/** One window of the trash and how many pages it holds for the search, whatever the window shows. */
export const trashedPagesListSchema = z.object({
  items: z.array(trashedPageSchema),
  total: z.number().int().min(0),
});

export const trashWindowInputSchema = z.object({
  search: z.string().trim().max(200).optional(),
  skip: z.number().int().min(0),
});

export const trashDescendantsPreviewSchema = z.object({ childPageCount: z.number() });

export const trashRestoreOutcomeSchema = z.object({
  parentTitle: z.string().nullable(),
  restoredChildCount: z.number(),
  restoredToRoot: z.boolean(),
  spaceName: z.string().nullable(),
});

export const trashListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  spaceId: z.string().min(1).optional(),
});

export const trashEmptySchema = z.object({
  spaceId: z.string().min(1).optional(),
});
