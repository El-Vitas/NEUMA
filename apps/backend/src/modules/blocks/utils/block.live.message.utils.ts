import { Result } from '@neuma/shared';
import { BLOCK_LIVE_MAX_MESSAGE_BYTES, BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES } from '../constants/block.live.constants';
import type { LiveServerMessage, VersionNotification } from '../domain/block.live.domain.types';
import { BlockLiveInvalidMessageError } from '../domain/block.live.error';
import { blockLiveClientMessageSchema, blockVersionNotificationSchema } from '../schemas/block.live.schemas';
import type { BlockLiveClientMessage, BlockLiveReplyMessage, BlockLiveRequestMessage } from '../types/block.live.types';

/** JSON that does not parse is untrusted input like any other, so it is refused the same way. */
const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export const parseClientMessage = (text: string): Result<BlockLiveClientMessage, BlockLiveInvalidMessageError> => {
  const parsed = blockLiveClientMessageSchema.safeParse(parseJson(text));
  return parsed.success ? Result.ok(parsed.data) : Result.fail(new BlockLiveInvalidMessageError());
};

const isRequestMessage = (message: BlockLiveClientMessage): message is BlockLiveRequestMessage =>
  message.type === 'transactions' || message.type === 'sync';

/** Only a well-formed request may be larger than the small limit, and never larger than the request limit. */
export const isMessageWithinSizeLimit = (
  byteLength: number,
  parsed: Result<BlockLiveClientMessage, BlockLiveInvalidMessageError>,
): boolean => {
  if (byteLength <= BLOCK_LIVE_MAX_MESSAGE_BYTES) return true;
  return parsed.isOk() && isRequestMessage(parsed.getValue()) && byteLength <= BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES;
};

export const parseVersionNotification = (
  payload: string,
): Result<VersionNotification, BlockLiveInvalidMessageError> => {
  const parsed = blockVersionNotificationSchema.safeParse(parseJson(payload));
  if (!parsed.success) return Result.fail(new BlockLiveInvalidMessageError());
  const notification = parsed.data;
  return Result.ok(
    'truncated' in notification
      ? { kind: 'truncated', spaceId: notification.spaceId }
      : { blocks: notification.blocks, kind: 'versions', spaceId: notification.spaceId },
  );
};

export const serializeServerMessage = (message: BlockLiveReplyMessage | LiveServerMessage): string =>
  JSON.stringify(message);
