import { pageIconSchema, SPACE_VISIBILITY_VALUES } from '@neuma/shared';
import { z } from 'zod';
import { pathSegmentSchema } from '@/shared/schemas/path-segment.schemas';
import {
  SPACE_DESCRIPTION_MAX_LENGTH,
  SPACE_NAME_MAX_LENGTH,
  SPACE_SLUG_MAX_LENGTH,
} from '../constants/spaces.constants';

export const spaceVisibilitySchema = z.enum(SPACE_VISIBILITY_VALUES);

export const spaceSummarySchema = z.object({
  description: z.string().nullable(),
  icon: pageIconSchema.nullable(),
  id: z.string(),
  name: z.string(),
  order: z.number(),
  ownerId: z.string().nullable(),
  slug: z.string(),
  visibility: spaceVisibilitySchema,
});

export const spacesListSchema = z.array(spaceSummarySchema);

export const reorderSpaceSchema = z.object({
  beforeSpaceId: pathSegmentSchema.nullable(),
  spaceId: pathSegmentSchema,
});

export const renameSpaceSchema = z.object({
  name: z.string().trim().min(1).max(SPACE_NAME_MAX_LENGTH),
  spaceId: pathSegmentSchema,
});

export const describeSpaceSchema = z.object({
  /** Empty is valid and clears the description. */
  description: z.string().trim().max(SPACE_DESCRIPTION_MAX_LENGTH),
  spaceId: pathSegmentSchema,
});

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(SPACE_NAME_MAX_LENGTH),
  slug: z.string().trim().min(1).max(SPACE_SLUG_MAX_LENGTH),
  visibility: spaceVisibilitySchema,
});

export const shareSpaceSchema = z.object({
  spaceId: pathSegmentSchema,
  userId: pathSegmentSchema,
});
