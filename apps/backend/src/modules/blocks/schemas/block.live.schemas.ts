import { USER_ROLE_VALUES } from '@neuma/shared';
import { z } from 'zod';
import {
  BLOCK_LIVE_TOKEN_AUDIENCE,
  BLOCK_LIVE_TOKEN_MAX_LENGTH,
  BLOCK_LIVE_TOKEN_PURPOSE,
} from '../constants/block.live.constants';
import { BLOCK_TRANSACTION_ID_MAX_LENGTH } from '../constants/block.transaction.constants';
import { BLOCK_ID_MAX_LENGTH, BLOCK_VERSION_MAX } from '../constants/blocks.constants';
import type { BlockLiveClientMessage } from '../types/block.live.types';

const blockIdSchema = z.string().min(1).max(BLOCK_ID_MAX_LENGTH);

export const blockLiveClientMessageSchema: z.ZodType<BlockLiveClientMessage> = z.discriminatedUnion('type', [
  z.strictObject({ token: z.string().min(1).max(BLOCK_LIVE_TOKEN_MAX_LENGTH), type: z.literal('auth') }),
  z.strictObject({ pageId: blockIdSchema, type: z.literal('subscribe') }),
  z.strictObject({ pageId: blockIdSchema, type: z.literal('unsubscribe') }),
  z.strictObject({ blockId: blockIdSchema.nullable(), pageId: blockIdSchema, type: z.literal('presence') }),
  z.strictObject({ type: z.literal('ping') }),
]);

const versionSchema = z.strictObject({
  id: blockIdSchema,
  version: z.number().int().min(0).max(BLOCK_VERSION_MAX),
});

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
