import { isValidPageTimeZone } from '@neuma/shared';
import { z } from 'zod';

export const timeZoneSchema = z.object({
  timeZone: z.string().min(1).max(64).refine(isValidPageTimeZone),
});
