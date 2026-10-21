import { BLOCK_TYPE } from '@neuma/shared';
import { isBlockReadableInPage, isPageReadable, toViewerAccess } from './block.live.access.domain';
import { BLOCK_LIVE_COLLECTION_MESSAGE_MAX_ROWS } from './block.live.constants';
import type {
  CollectionDeliveryInput,
  CollectionRowSlice,
  CollectionSubscription,
  LiveAccessContext,
  LiveDelivery,
  LiveServerMessage,
  ViewerAccess,
} from './block.live.domain.types';
import type { NotifiedBlock } from './block.transaction.domain.types';

const toDelivery = (subscription: CollectionSubscription, message: LiveServerMessage): LiveDelivery => ({
  connectionId: subscription.connectionId,
  message,
});

const toResync = (subscription: CollectionSubscription): LiveDelivery =>
  toDelivery(subscription, { collectionId: subscription.collectionId, type: 'collection-resync' });

const isRowOf = (collectionId: string, block: NotifiedBlock, context: LiveAccessContext): boolean => {
  const row = context.rowsById.get(block.id);
  return row?.type === BLOCK_TYPE.page && row.parentId === collectionId;
};

/** The reader may have held this row before: it left the collection, or its permissions changed. */
const mayHaveBeenReadable = (block: NotifiedBlock): boolean =>
  block.hasAccessChange === true || block.previousParentId !== undefined;

const isHiddenWithAccessChange = (block: NotifiedBlock, access: ViewerAccess): boolean =>
  !isBlockReadableInPage(block.id, block.id, access) && mayHaveBeenReadable(block);

const isLeaver = (collectionId: string, block: NotifiedBlock): boolean => block.previousParentId === collectionId;

const sliceRows = (
  subscription: CollectionSubscription,
  input: CollectionDeliveryInput,
  access: ViewerAccess,
): CollectionRowSlice => {
  const { collectionId } = subscription;
  const inCollection = input.blocks.filter((block) => isRowOf(collectionId, block, input.context));
  const readable = inCollection.filter((block) => isBlockReadableInPage(block.id, block.id, access));
  const isResyncNeeded =
    input.blocks.some((block) => isLeaver(collectionId, block)) ||
    inCollection.some((block) => isHiddenWithAccessChange(block, access)) ||
    readable.length > BLOCK_LIVE_COLLECTION_MESSAGE_MAX_ROWS;
  return { isResyncNeeded, rows: readable };
};

const toChanges = (
  subscription: CollectionSubscription,
  input: CollectionDeliveryInput,
  rows: readonly NotifiedBlock[],
): LiveDelivery[] => {
  const { collectionId } = subscription;
  const schema = input.blocks.find((block) => block.id === collectionId);
  const views = input.views.filter((view) => view.pageId === collectionId);
  if (rows.length === 0 && views.length === 0 && schema === undefined) return [];
  return [
    toDelivery(subscription, {
      collectionId,
      rows: rows.map(({ id, version }) => ({ id, version })),
      ...(schema === undefined ? {} : { schemaVersion: schema.version }),
      type: 'collection-changes',
      views: views.map(({ id, version }) => ({ id, version })),
    }),
  ];
};

const planFor = (subscription: CollectionSubscription, input: CollectionDeliveryInput): LiveDelivery[] => {
  const access = toViewerAccess(input.context, subscription.userId);
  if (access === undefined) return [toResync(subscription)];
  if (!isPageReadable(subscription.collectionId, access)) {
    return [toDelivery(subscription, { collectionId: subscription.collectionId, type: 'collection-revoked' })];
  }
  const slice = sliceRows(subscription, input, access);
  return slice.isResyncNeeded ? [toResync(subscription)] : toChanges(subscription, input, slice.rows);
};

/**
 * What each collection subscriber is told after a committed transaction: the rows it may read with their versions,
 * the views and the schema of the collection. A row it may not read is never named; it only prompts a new query
 * when the transaction changed who could read it or moved it out of the collection.
 */
export const planCollectionDeliveries = (input: CollectionDeliveryInput): LiveDelivery[] =>
  input.subscriptions.flatMap((subscription) => planFor(subscription, input));

/** Notifications may have been lost, so every collection subscriber queries again. */
export const planCollectionResync = (subscriptions: readonly CollectionSubscription[]): LiveDelivery[] =>
  subscriptions.map(toResync);
