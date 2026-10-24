import { z } from 'zod';

export const linkPreviewResponseSchema = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  url: z.string(),
});
