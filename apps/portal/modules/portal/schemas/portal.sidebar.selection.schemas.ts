import { z } from 'zod';

export const portalPageBatchTrashSchema = z.object({
  pageIds: z.array(z.string().min(1)).min(1),
  spaceId: z.string().min(1),
});

export const portalPageBatchMoveSchema = z.object({
  pageIds: z.array(z.string().min(1)).min(1),
  parentId: z.string().min(1).nullable(),
  spaceId: z.string().min(1),
  targetSpaceId: z.string().min(1).optional(),
});

export const portalPageBatchOutcomeSchema = z.object({
  failedIds: z.array(z.string()),
  succeededIds: z.array(z.string()),
});
