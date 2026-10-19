import { USER_ROLE_VALUES } from '@neuma/shared';
import { z } from 'zod';
import {
  BLOCK_LIVE_REQUEST_ID_MAX_LENGTH,
  BLOCK_LIVE_TOKEN_AUDIENCE,
  BLOCK_LIVE_TOKEN_MAX_LENGTH,
  BLOCK_LIVE_TOKEN_PURPOSE,
} from '../constants/block.live.constants';
import {
  BLOCK_OPERATIONS_MAX_PER_TRANSACTION,
  BLOCK_TRANSACTION_ID_MAX_LENGTH,
  BLOCK_TRANSACTIONS_MAX_PER_REQUEST,
} from '../constants/block.transaction.constants';
import { BLOCK_ID_MAX_LENGTH, BLOCK_SYNC_MAX_REQUESTED_BLOCKS, BLOCK_VERSION_MAX } from '../constants/blocks.constants';
import type { BlockLiveClientMessage } from '../types/block.live.types';

const blockIdSchema = z.string().min(1).max(BLOCK_ID_MAX_LENGTH);

const requestIdSchema = z.string().min(1).max(BLOCK_LIVE_REQUEST_ID_MAX_LENGTH);

const versionSchema = z.strictObject({
  id: blockIdSchema,
  version: z.number().int().min(0).max(BLOCK_VERSION_MAX),
});

/**
 * The same bounds as `ApplyBlockTransactionsDto` and `SyncBlocksDto`, read from the same constants. The HTTP endpoints
 * keep their class-validator DTOs because Nest's `ValidationPipe` runs those; the two cannot share one schema.
 */
const transactionSchema = z.strictObject({
  id: z.string().min(1).max(BLOCK_TRANSACTION_ID_MAX_LENGTH),
  operations: z.array(z.record(z.string(), z.unknown())).min(1).max(BLOCK_OPERATIONS_MAX_PER_TRANSACTION),
  spaceId: blockIdSchema,
});

const requestAndOtherMessagesSchema = z.discriminatedUnion('type', [
  z.strictObject({ token: z.string().min(1).max(BLOCK_LIVE_TOKEN_MAX_LENGTH), type: z.literal('auth') }),
  z.strictObject({ pageId: blockIdSchema, type: z.literal('subscribe') }),
  z.strictObject({ pageId: blockIdSchema, type: z.literal('unsubscribe') }),
  z.strictObject({ blockId: blockIdSchema.nullable(), pageId: blockIdSchema, type: z.literal('presence') }),
  z.strictObject({ type: z.literal('ping') }),
  z.strictObject({
    requestId: requestIdSchema,
    transactions: z.array(transactionSchema).min(1).max(BLOCK_TRANSACTIONS_MAX_PER_REQUEST),
    type: z.literal('transactions'),
  }),
]);

/** A sync names exactly one of a page or the versions held, so the two shapes are separate members. */
export const blockLiveClientMessageSchema: z.ZodType<BlockLiveClientMessage> = z.union([
  requestAndOtherMessagesSchema,
  z.strictObject({ pageId: blockIdSchema, requestId: requestIdSchema, type: z.literal('sync') }),
  z.strictObject({
    blocks: z.array(versionSchema).min(1).max(BLOCK_SYNC_MAX_REQUESTED_BLOCKS),
    requestId: requestIdSchema,
    type: z.literal('sync'),
  }),
]);

/** What `pg_notify` carries: the touched blocks, or only that they were too many to fit. */
export const blockVersionNotificationSchema = z.union([
  z.object({
    blocks: z.array(versionSchema),
    spaceId: z.string().min(1),
    transactionId: z.string().min(1).max(BLOCK_TRANSACTION_ID_MAX_LENGTH),
  }),
  z.object({
    spaceId: z.string().min(1),
    transactionId: z.string().min(1).max(BLOCK_TRANSACTION_ID_MAX_LENGTH),
    truncated: z.literal(true),
  }),
]);

export const blockLiveTokenPayloadSchema = z.object({
  aud: z.literal(BLOCK_LIVE_TOKEN_AUDIENCE),
  purpose: z.literal(BLOCK_LIVE_TOKEN_PURPOSE),
  role: z.enum(USER_ROLE_VALUES),
  sub: z.string().min(1),
  workspaceId: z.string().min(1),
});
