import { z } from 'zod';

export const recentPageEntrySchema = z.object({
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
  spaceName: z.string().min(1),
  title: z.string().min(1),
  visitedAt: z.number(),
});

export const recentPagesListSchema = z.array(recentPageEntrySchema);
