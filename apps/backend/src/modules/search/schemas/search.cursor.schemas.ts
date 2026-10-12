import { z } from 'zod';

export const searchCursorSchema = z.object({
  rank: z.number(),
  sourceId: z.string(),
  updatedAt: z.iso.datetime(),
});
