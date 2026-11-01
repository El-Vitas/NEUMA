import { blockPermissionEntrySchema } from '@neuma/shared';
import { z } from 'zod';

export const declaringAncestorsSchema = z.array(
  z.object({
    depth: z.number().int(),
    id: z.string(),
    permissions: z.array(blockPermissionEntrySchema),
  }),
);

export const headingEntriesSchema = z.array(z.object({ level: z.number().int(), text: z.string() }));
