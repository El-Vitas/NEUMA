import { z } from 'zod';

export const themeDecisionSchema = z.object({
  choice: z.enum(['system', 'light', 'dark']),
  reading: z.enum(['light', 'dark']),
});
