import { z } from 'zod';
import { pageAuthorSchema } from './pages.schemas';

export const trashedPageSchema = z.object({
  deletedAt: z.coerce.date(),
  deletedBy: pageAuthorSchema.nullable(),
  id: z.string(),
  parentId: z.string().nullable(),
  spaceId: z.string(),
  title: z.string(),
  trashedChildCount: z.number(),
});

export const trashedPagesListSchema = z.array(trashedPageSchema);

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
