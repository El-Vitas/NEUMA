import { z } from 'zod';

const pageBlockSchema = z.discriminatedUnion('type', [
  z.object({ text: z.string().max(20_000), type: z.literal('paragraph') }),
  z.object({ text: z.string().max(20_000), type: z.literal('heading') }),
]);

export const pageContentSchema = z.object({
  blocks: z.array(pageBlockSchema).max(500),
  schemaVersion: z.literal(1),
});

export type PageContent = z.infer<typeof pageContentSchema>;
