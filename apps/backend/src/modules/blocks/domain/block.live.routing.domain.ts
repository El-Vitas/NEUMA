import {
  hasAccessChangeAbove,
  isBlockReadableInPage,
  isPageReadable,
  toViewerAccess,
} from './block.live.access.domain';
import type {
  ChainRowsById,
  LiveAccessContext,
  LiveDelivery,
  LiveServerMessage,
  LiveSubscription,
  PresenceDeliveryInput,
  PresenceEntry,
  PresenceUser,
  VersionDeliveryInput,
  ViewerAccess,
} from './block.live.domain.types';
import type { BlockVersion } from './block.transaction.domain.types';
import { findSourcePageId } from './block.tree.domain';

const toDelivery = (subscription: LiveSubscription, message: LiveServerMessage): LiveDelivery => ({
  connectionId: subscription.connectionId,
  message,
});

/**
 * A subscription is filed under the space the page had when it was made. A page that moved to another space is
 * filed again under its new one, or the edits that name that space would never find the subscriber.
 */
export const listSubscriptionsInOtherSpace = (
  subscriptions: readonly LiveSubscription[],
  context: LiveAccessContext,
): { connectionId: string; pageId: string; spaceId: string }[] =>
  subscriptions.flatMap((subscription) => {
    const spaceId = context.rowsById.get(subscription.pageId)?.spaceId;
    return spaceId === undefined || spaceId === subscription.spaceId
      ? []
      : [{ connectionId: subscription.connectionId, pageId: subscription.pageId, spaceId }];
  });

const groupVersionsByPage = (
  blocks: readonly BlockVersion[],
  rowsById: ChainRowsById,
  maxDepth: number,
): ReadonlyMap<string, readonly BlockVersion[]> => {
  const grouped = new Map<string, BlockVersion[]>();
  for (const block of blocks) {
    const pageId = findSourcePageId(block.id, rowsById, maxDepth);
    if (pageId !== null) grouped.set(pageId, [...(grouped.get(pageId) ?? []), block]);
  }
  return grouped;
};

const planVersions = (
  subscription: LiveSubscription,
  access: ViewerAccess,
  versionsInPage: readonly BlockVersion[],
): LiveDelivery[] => {
  const readable = versionsInPage.filter((block) => isBlockReadableInPage(block.id, subscription.pageId, access));
  const versions =
    readable.length === 0
      ? []
      : [toDelivery(subscription, { blocks: readable, pageId: subscription.pageId, type: 'versions' })];
  const hasHiddenBlocks = readable.length < versionsInPage.length;
  return hasHiddenBlocks
    ? [...versions, toDelivery(subscription, { pageId: subscription.pageId, type: 'resync' })]
    : versions;
};

/**
 * What each subscriber is told after a committed transaction. A subscriber who can no longer read the page is
 * revoked and gets no versions; one whose access could not be resolved is told to read again. The others get
 * only the ids they can read, and a resync when some touched block was hidden from them, so a copy they hold of a
 * block that just became unreadable is dropped by the catch-up read without the id ever being named.
 */
export const planVersionDeliveries = ({ blocks, context, subscriptions }: VersionDeliveryInput): LiveDelivery[] => {
  const versionsByPage = groupVersionsByPage(blocks, context.rowsById, context.maxDepth);
  return subscriptions.flatMap((subscription) => {
    const access = toViewerAccess(context, subscription.userId);
    if (access === undefined) return [toDelivery(subscription, { pageId: subscription.pageId, type: 'resync' })];
    if (!isPageReadable(subscription.pageId, access)) {
      return [toDelivery(subscription, { pageId: subscription.pageId, type: 'revoked' })];
    }
    const versions = planVersions(subscription, access, versionsByPage.get(subscription.pageId) ?? []);
    return hasAccessChangeAbove(subscription.pageId, blocks, context)
      ? [...versions, toDelivery(subscription, { pageId: subscription.pageId, type: 'access-changed' })]
      : versions;
  });
};

/** Notifications may have been lost, so the client reads the page again through the sync endpoint. */
export const planResync = (subscriptions: readonly LiveSubscription[]): LiveDelivery[] =>
  subscriptions.map((subscription) => toDelivery(subscription, { pageId: subscription.pageId, type: 'resync' }));

const toPresenceUser = (entry: PresenceEntry, pageId: string, access: ViewerAccess | undefined): PresenceUser => {
  const isBlockVisible =
    access !== undefined && entry.blockId !== null && isBlockReadableInPage(entry.blockId, pageId, access);
  return { blockId: isBlockVisible ? entry.blockId : null, expiresAt: entry.expiresAt, userId: entry.userId };
};

/** Everyone is listed to everyone on the page, but a block id reaches only those who can read that block. */
export const planPresenceDeliveries = ({
  context,
  entries,
  pageId,
  subscriptions,
}: PresenceDeliveryInput): LiveDelivery[] =>
  subscriptions.map((subscription) => {
    const access = toViewerAccess(context, subscription.userId);
    return toDelivery(subscription, {
      pageId,
      type: 'presence',
      users: entries.map((entry) => toPresenceUser(entry, pageId, access)),
    });
  });
