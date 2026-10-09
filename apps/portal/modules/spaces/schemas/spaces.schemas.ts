import { pageIconSchema, SPACE_VISIBILITY_VALUES } from '@company-brain/shared';
import { z } from 'zod';
import {
  SPACE_DESCRIPTION_MAX_LENGTH,
  SPACE_NAME_MAX_LENGTH,
  SPACE_SLUG_MAX_LENGTH,
} from '../constants/spaces.constants';

export const spaceVisibilitySchema = z.enum(SPACE_VISIBILITY_VALUES);

/** Fields an older answer lacks, or that this version cannot read, fall back instead of emptying the space list. */
export const spaceSummarySchema = z.object({
  description: z.string().nullable().catch(null).default(null),
  icon: pageIconSchema.nullable().catch(null).default(null),
  id: z.string(),
  name: z.string(),
  order: z.number().catch(0).default(0),
  ownerId: z.string().nullable().catch(null).default(null),
  slug: z.string(),
  visibility: spaceVisibilitySchema,
});

export const spacesListSchema = z.array(spaceSummarySchema);

export const reorderSpaceSchema = z.object({
  beforeSpaceId: z.string().min(1).nullable(),
  spaceId: z.string().min(1),
});

export const renameSpaceSchema = z.object({
  name: z.string().trim().min(1).max(SPACE_NAME_MAX_LENGTH),
  spaceId: z.string().min(1),
});

export const describeSpaceSchema = z.object({
  /** Empty is valid and clears the description. */
  description: z.string().trim().max(SPACE_DESCRIPTION_MAX_LENGTH),
  spaceId: z.string().min(1),
});

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(SPACE_NAME_MAX_LENGTH),
  slug: z.string().trim().min(1).max(SPACE_SLUG_MAX_LENGTH),
  visibility: spaceVisibilitySchema,
});

export const shareSpaceSchema = z.object({
  spaceId: z.string().min(1),
  userId: z.string().min(1),
});
