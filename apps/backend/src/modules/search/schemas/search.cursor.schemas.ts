import { z } from 'zod';

export const searchCursorSchema = z.object({
  id: z.string(),
  matching: z.enum(['words', 'typo']),
  rank: z.number(),
});
