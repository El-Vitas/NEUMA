import { pageIconSchema, SPACE_VISIBILITY_VALUES } from '@company-brain/shared';
import { z } from 'zod';
import { SPACE_NAME_MAX_LENGTH, SPACE_SLUG_MAX_LENGTH } from '../constants/spaces.constants';

export const spaceVisibilitySchema = z.enum(SPACE_VISIBILITY_VALUES);

export const spaceSummarySchema = z.object({
  /** A mark nobody can draw leaves the space unmarked, rather than emptying the list it stands in. */
  icon: pageIconSchema.nullable().catch(null).default(null),
  id: z.string(),
  name: z.string(),
  /** Where the space sits among the others. An older answer without it keeps them in the order they arrived. */
  order: z.number().catch(0).default(0),
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

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(SPACE_NAME_MAX_LENGTH),
  slug: z.string().trim().min(1).max(SPACE_SLUG_MAX_LENGTH),
  visibility: spaceVisibilitySchema,
});
