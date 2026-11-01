import { PAGE_LIFECYCLE_VALUES } from '@neuma/shared';
import { z } from 'zod';
import { pathSegmentSchema } from '@/shared/schemas/path-segment.schemas';
import { FAVORITE_MOVE_DIRECTIONS } from '../constants/favorites.constants';

export const favoritePageSchema = z.object({
  favoriteId: z.string(),
  lifecycle: z.enum(PAGE_LIFECYCLE_VALUES),
  order: z.number(),
  pageId: z.string(),
  spaceId: z.string(),
  title: z.string(),
});

export const favoritePagesListSchema = z.array(favoritePageSchema);

export const favoriteMutationSchema = z.object({
  pageId: pathSegmentSchema,
});

export const favoriteMoveSchema = z.object({
  direction: z.enum(FAVORITE_MOVE_DIRECTIONS),
  pageId: pathSegmentSchema,
});
