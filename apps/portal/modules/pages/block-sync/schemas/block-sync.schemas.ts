import { z } from 'zod';
import { BLOCK_SYNC_COMMAND } from '../constants/block-sync.constants';

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const syncedBlockSchema = z.object({
  alive: z.boolean(),
  children: z.array(z.string()),
  format: jsonObjectSchema.nullable().transform((format) => format ?? {}),
  hasOwnPermissions: z.boolean().optional().default(false),
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

/** What a transaction read back from disk must look like before it is sent again: the disk is not trusted. */
export const blockWireOperationSchema = z.object({
  args: z.unknown(),
  command: z.enum([
    BLOCK_SYNC_COMMAND.applyText,
    BLOCK_SYNC_COMMAND.listAfter,
    BLOCK_SYNC_COMMAND.listBefore,
    BLOCK_SYNC_COMMAND.listRemove,
    BLOCK_SYNC_COMMAND.set,
    BLOCK_SYNC_COMMAND.update,
  ]),
  path: z.array(z.string()),
  pointer: z.object({ id: z.string(), table: z.literal('block') }),
});

export const blockLiveTokenResponseSchema = z.object({ token: z.string().min(1) });

const blockVersionSchema = z.object({ id: z.string(), version: z.number().int() });

const transactionOutcomeSchema = z.union([
  z.object({ blocks: z.array(blockVersionSchema), id: z.string() }),
  z.object({
    error: z.object({ code: z.string(), details: z.unknown().optional(), message: z.string() }),
    id: z.string(),
  }),
]);

export const blockLiveServerMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('pong') }),
  z.object({ pageId: z.string(), type: z.literal('subscribed') }),
  z.object({
    code: z.string(),
    collectionId: z.string().optional(),
    pageId: z.string().optional(),
    requestId: z.string().optional(),
    type: z.literal('error'),
  }),
  z.object({ blocks: z.array(blockVersionSchema), pageId: z.string(), type: z.literal('versions') }),
  z.object({ pageId: z.string(), type: z.literal('resync') }),
  z.object({ pageId: z.string(), type: z.literal('revoked') }),
  z.object({ pageId: z.string(), type: z.literal('access-changed') }),
  z.object({ collectionId: z.string(), type: z.literal('subscribed-collection') }),
  z.object({
    collectionId: z.string(),
    rows: z.array(blockVersionSchema),
    schemaVersion: z.number().int().optional(),
    type: z.literal('collection-changes'),
    views: z.array(blockVersionSchema),
  }),
  z.object({ collectionId: z.string(), type: z.literal('collection-resync') }),
  z.object({ collectionId: z.string(), type: z.literal('collection-revoked') }),
  z.object({ blockId: z.string(), discussionId: z.string(), pageId: z.string(), type: z.literal('discussion') }),
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
