import { pageCoverValueSchema } from '@neuma/shared';
import { z } from 'zod';

export { pageCoverValueSchema };

export const pageCoverLocatorSchema = z.object({ pageId: z.string().min(1), spaceId: z.string().min(1) });

export const pageCoverImageUploadSchema = pageCoverLocatorSchema.extend({
  file: z.instanceof(File),
  previousAssetId: z.uuid().optional(),
});

export const pageCoverRepositionSchema = pageCoverLocatorSchema.extend({
  assetId: pageCoverValueSchema.shape.assetId,
  position: pageCoverValueSchema.shape.position,
});

export const pageCoverRemoveSchema = pageCoverLocatorSchema.extend({
  previousAssetId: z.uuid().optional(),
});
