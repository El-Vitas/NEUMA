import { BLOCK_TYPE } from '@neuma/shared';
import { isPageReadable, toViewerAccess } from './block.live.access.domain';
import { BLOCK_LIVE_TREE_MESSAGE_MAX_PARENTS } from './block.live.constants';
import type {
  LiveAccessContext,
  LiveDelivery,
  LiveServerMessage,
  TreeDeliveryInput,
  TreeSubscription,
  ViewerAccess,
} from './block.live.domain.types';
import type { NotifiedBlock } from './block.transaction.domain.types';

const toDelivery = (subscription: TreeSubscription, message: LiveServerMessage): LiveDelivery => ({
  connectionId: subscription.connectionId,
  message,
});

const toResync = (subscription: TreeSubscription): LiveDelivery =>
  toDelivery(subscription, { spaceId: subscription.spaceId, type: 'tree-resync' });

/** The parents whose list of children a page that was touched can alter: where it is now and where it was. */
const listAffectedParents = (block: NotifiedBlock, input: TreeDeliveryInput): (string | null)[] => {
  const row = input.context.rowsById.get(block.id);
  if (row?.type !== BLOCK_TYPE.page || row.isTemplate === true) return [];
  return block.previousParentId === undefined ? [row.parentId] : [row.parentId, block.previousParentId];
};

/**
 * A parent is told only when the follower may read it, so a closed page is never revealed. The top of a space has no
 * parent to read: the page itself must be readable, unless its access just changed, because then the follower may
 * be the one who lost it and its list at the top must be read again.
 */
const canTellParent = (parentId: string | null, block: NotifiedBlock, access: ViewerAccess): boolean => {
  if (parentId !== null) return isPageReadable(parentId, access);
  return block.hasAccessChange === true || isPageReadable(block.id, access);
};

const readParentsFor = (input: TreeDeliveryInput, access: ViewerAccess): (string | null)[] => {
  const parents = new Set<string | null>();
  for (const block of input.blocks) {
    for (const parentId of listAffectedParents(block, input)) {
      if (canTellParent(parentId, block, access)) parents.add(parentId);
    }
  }
  return [...parents];
};

const canReadSpace = (context: LiveAccessContext, subscription: TreeSubscription): boolean =>
  context.readableSpaceIdsByUserId.get(subscription.userId)?.has(subscription.spaceId) === true;

/** The followers that can no longer read the space at all, which no page rule explains and no parent tells. */
export const listLostTreeSubscriptions = (
  context: LiveAccessContext,
  subscriptions: readonly TreeSubscription[],
): TreeSubscription[] =>
  subscriptions.filter(
    (subscription) =>
      toViewerAccess(context, subscription.userId) !== undefined && !canReadSpace(context, subscription),
  );

const planFor = (subscription: TreeSubscription, input: TreeDeliveryInput): LiveDelivery[] => {
  const access = toViewerAccess(input.context, subscription.userId);
  if (access === undefined || !canReadSpace(input.context, subscription)) return [toResync(subscription)];
  const parentIds = readParentsFor(input, access);
  if (parentIds.length === 0) return [];
  if (parentIds.length > BLOCK_LIVE_TREE_MESSAGE_MAX_PARENTS) return [toResync(subscription)];
  return [toDelivery(subscription, { parentIds, spaceId: subscription.spaceId, type: 'tree-changed' })];
};

/**
 * What each follower of a space tree is told after a committed transaction: the parents whose list of children
 * changed, and only the ones it may read. It never names a page, so a closed page is not revealed; the follower
 * reads again the parents it has open.
 */
export const planTreeDeliveries = (input: TreeDeliveryInput): LiveDelivery[] =>
  input.subscriptions.flatMap((subscription) => planFor(subscription, input));

/** Notifications may have been lost, so every follower reads its open branches again. */
export const planTreeResync = (subscriptions: readonly TreeSubscription[]): LiveDelivery[] =>
  subscriptions.map(toResync);
