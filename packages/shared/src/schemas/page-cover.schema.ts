import { z } from 'zod';

const minimumPageCoverPosition = 0;
const maximumPageCoverPosition = 100;

export const pageCoverValueSchema = z.object({
  assetId: z.uuid(),
  position: z.number().min(minimumPageCoverPosition).max(maximumPageCoverPosition),
});

export type PageCoverValue = z.infer<typeof pageCoverValueSchema>;
