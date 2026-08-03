import { z } from 'zod';

export const pageCollaborationTokenRequestSchema = z.object({
  pageId: z.uuid(),
});

export const pageCollaborationTokenResponseSchema = z.object({
  token: z.string().min(1),
});
