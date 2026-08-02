import { SPACE_VISIBILITY_VALUES } from '@company-brain/shared';
import { z } from 'zod';

export const spaceVisibilitySchema = z.enum(SPACE_VISIBILITY_VALUES);

export const spaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  visibility: spaceVisibilitySchema,
});

export const spacesListSchema = z.array(spaceSummarySchema);
