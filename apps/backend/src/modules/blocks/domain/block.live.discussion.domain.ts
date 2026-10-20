import { isBlockReadableInPage, toViewerAccess } from './block.live.access.domain';
import type {
  CommentNotificationDeliveryInput,
  DiscussionDeliveryInput,
  LiveDelivery,
} from './block.live.domain.types';

/**
 * Who is told that a discussion changed: the subscribers of the page the block lives in who can read that block.
 * Anyone else gets nothing, so the channel never reveals that a hidden block has a conversation.
 */
export const planDiscussionDeliveries = ({
  blockId,
  context,
  discussionId,
  subscriptions,
}: DiscussionDeliveryInput): LiveDelivery[] =>
  subscriptions.flatMap((subscription) => {
    const access = toViewerAccess(context, subscription.userId);
    if (access === undefined || !isBlockReadableInPage(blockId, subscription.pageId, access)) return [];
    return [
      {
        connectionId: subscription.connectionId,
        message: { blockId, discussionId, pageId: subscription.pageId, type: 'discussion' as const },
      },
    ];
  });

/** A notification belongs to one person and reaches all their open sockets. It names an id, not its content. */
export const planCommentNotificationDeliveries = ({
  connections,
  notificationId,
  recipientId,
}: CommentNotificationDeliveryInput): LiveDelivery[] =>
  connections
    .filter((connection) => connection.userId === recipientId)
    .map((connection) => ({
      connectionId: connection.connectionId,
      message: { notificationId, type: 'notification' as const },
    }));
