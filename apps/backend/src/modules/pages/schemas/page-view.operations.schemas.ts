import { z } from 'zod';

const listEntriesSchema = z.array(z.string().min(1).max(200)).max(50).default([]);

export const listChangesSchema = z.record(
  z.string().min(1).max(100),
  z.object({ add: listEntriesSchema, remove: listEntriesSchema }).strict(),
);

export const wireOperationSchema = z
  .object({ args: z.unknown(), command: z.string(), path: z.array(z.string()) })
  .strict();
