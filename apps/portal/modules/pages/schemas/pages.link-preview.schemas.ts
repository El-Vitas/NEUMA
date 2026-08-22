import { z } from 'zod';
import { isReachableLinkPreviewAddress } from '../lib/pages.link-preview.address.lib';

/** What may be asked about: one address out on the internet, and nothing the server keeps to itself. */
export const linkPreviewRequestSchema = z.object({
  url: z.url().refine(isReachableLinkPreviewAddress),
});
