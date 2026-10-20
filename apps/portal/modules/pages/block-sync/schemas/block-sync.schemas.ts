import { z } from 'zod';

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const syncedBlockSchema = z.object({
  alive: z.boolean(),
  children: z.array(z.string()),
  format: jsonObjectSchema.nullable().transform((format) => format ?? {}),
  id: z.string(),
  parentId: z.string().nullable(),
  properties: jsonObjectSchema,
  role: z.string(),
  spaceId: z.string(),
  textState: z.string().nullable().optional().default(null),
  type: z.string(),
  version: z.number().int(),
});

export const blockSyncResponseSchema = z.object({
  blocks: z.array(syncedBlockSchema),
  revoked: z.array(z.string()).optional(),
});

export const blockLiveTokenResponseSchema = z.object({ token: z.string().min(1) });

const blockVersionSchema = z.object({ id: z.string(), version: z.number().int() });

const transactionOutcomeSchema = z.union([
  z.object({ blocks: z.array(blockVersionSchema), id: z.string() }),
  z.object({ error: z.object({ code: z.string(), message: z.string() }), id: z.string() }),
]);

export const blockLiveServerMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('pong') }),
  z.object({ pageId: z.string(), type: z.literal('subscribed') }),
  z.object({
    code: z.string(),
    pageId: z.string().optional(),
    requestId: z.string().optional(),
    type: z.literal('error'),
  }),
  z.object({ blocks: z.array(blockVersionSchema), pageId: z.string(), type: z.literal('versions') }),
  z.object({ pageId: z.string(), type: z.literal('resync') }),
  z.object({ pageId: z.string(), type: z.literal('revoked') }),
  z.object({
    pageId: z.string(),
    type: z.literal('presence'),
    users: z.array(z.object({ blockId: z.string().nullable(), expiresAt: z.number(), userId: z.string() })),
  }),
  z.object({
    requestId: z.string(),
    transactions: z.array(transactionOutcomeSchema),
    type: z.literal('transactionsResult'),
  }),
  z.object({
    blocks: z.array(syncedBlockSchema),
    requestId: z.string(),
    revoked: z.array(z.string()).optional(),
    type: z.literal('syncResult'),
  }),
]);
