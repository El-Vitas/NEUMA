import { z } from 'zod';

/** What may be asked about: one address, and only over a safe connection. */
export const linkPreviewRequestSchema = z.object({
  url: z.url().refine((value) => new URL(value).protocol === 'https:'),
});
