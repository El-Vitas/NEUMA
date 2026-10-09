import { z } from 'zod';
import { isReachableLinkPreviewAddress } from '../lib/pages.link-preview.address.lib';

export const linkPreviewRequestSchema = z.object({
  url: z.url().refine(isReachableLinkPreviewAddress),
});
