import { Result } from '@neuma/shared';
import type { LiveServerMessage, VersionNotification } from '../domain/block.live.domain.types';
import { BlockLiveInvalidMessageError } from '../domain/block.live.error';
import { blockLiveClientMessageSchema, blockVersionNotificationSchema } from '../schemas/block.live.schemas';
import type { BlockLiveClientMessage } from '../types/block.live.types';

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

export const serializeServerMessage = (message: LiveServerMessage): string => JSON.stringify(message);
