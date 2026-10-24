import { z } from 'zod';
import { PAGE_IDS_MAX_COUNT } from '@/shared/constants/path-segment.constants';
import { pathSegmentSchema } from '@/shared/schemas/path-segment.schemas';

const pageIdsSchema = z.array(pathSegmentSchema).min(1).max(PAGE_IDS_MAX_COUNT);

export const portalPageBatchTrashSchema = z.object({
  pageIds: pageIdsSchema,
  spaceId: pathSegmentSchema,
});

export const portalPageBatchMoveSchema = z.object({
  pageIds: pageIdsSchema,
  parentId: pathSegmentSchema.nullable(),
  spaceId: pathSegmentSchema,
  targetSpaceId: pathSegmentSchema.optional(),
});

export const portalPageBatchOutcomeSchema = z.object({
  failedIds: z.array(z.string()),
  succeededIds: z.array(z.string()),
});
