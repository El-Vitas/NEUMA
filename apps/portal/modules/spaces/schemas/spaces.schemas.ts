import { SPACE_VISIBILITY_VALUES } from '@company-brain/shared';
import { z } from 'zod';
import { SPACE_NAME_MAX_LENGTH, SPACE_SLUG_MAX_LENGTH } from '../constants/spaces.constants';

export const spaceVisibilitySchema = z.enum(SPACE_VISIBILITY_VALUES);

export const spaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  visibility: spaceVisibilitySchema,
});

export const spacesListSchema = z.array(spaceSummarySchema);

export const spaceMemberSchema = z.object({
  email: z.string(),
  id: z.string(),
  name: z.string(),
});

export const spaceMembersListSchema = z.array(spaceMemberSchema);

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(SPACE_NAME_MAX_LENGTH),
  slug: z.string().trim().min(1).max(SPACE_SLUG_MAX_LENGTH),
  visibility: spaceVisibilitySchema,
});
