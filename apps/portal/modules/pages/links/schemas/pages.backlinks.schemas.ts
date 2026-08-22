import { z } from 'zod';

export const pageBacklinkSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  title: z.string(),
});

export const pageBacklinksResultSchema = z.object({
  count: z.number().int().min(0),
  items: z.array(pageBacklinkSchema),
});
