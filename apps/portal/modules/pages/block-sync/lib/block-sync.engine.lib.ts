import type { PageContent } from '@neuma/shared';
import { computeCollaborationReconnectDelayMs } from '../../lib/pages.collaboration.lib';
import type { PagesAutosaveDisplayState } from '../../types/pages.autosave.types';
import {
  BLOCK_SYNC_COALESCE_INTERVAL_MS,
  BLOCK_SYNC_FORBIDDEN_ERROR_CODES,
  BLOCK_SYNC_FORCE_VERSION,
  BLOCK_SYNC_OPERATIONS_PER_TRANSACTION_MAX,
  BLOCK_SYNC_REBASE_ATTEMPTS_MAX,
  BLOCK_SYNC_SAVE_STATE_BY_QUEUE_STATE,
} from '../constants/block-sync.constants';
import type {
  BlockOperationGroup,
  BlockQueueState,
  BlockSentTransaction,
  BlockSnapshotMap,
  BlockSyncEngine,
  BlockSyncEngineOptions,
  BlockSyncResponse,
  BlockTransaction,
  BlockTransactionError,
  BlockVersion,
  BlockWireOperation,
} from '../types/block-sync.types';
import { createCursorReporter } from './block-sync.cursor.lib';
import { diffSnapshots } from './block-sync.diff.lib';
import { BlockLiveRequestError } from './block-sync.errors.lib';
import {
  buildApplyTextOperation,
  chunkOperationGroups,
  countOperationsByBlock,
  listTouchedBlockIds,
} from './block-sync.operations.lib';
import { mapPresenceToParticipants, readBlockIdAtSelection } from './block-sync.presence.lib';
import { createTransactionQueue } from './block-sync.queue.lib';
import { areSnapshotMapsEqual, buildContentFromSnapshots, overlaySnapshots } from './block-sync.rows.lib';
import { snapshotContent } from './block-sync.snapshot.lib';
import { createBlockStore } from './block-sync.store.lib';

/**
 * Keeps the editor and the blocks of one page the same. The editor reports its document; the engine turns each
 * change into a transaction, sends them in order, and brings what others did back into the editor.
 */
export const createBlockSyncEngine = (options: BlockSyncEngineOptions): BlockSyncEngine => {
  const { bridge, callbacks, createId, initialBlocks, localUserId, pageId, resolveParticipant, spaceId } = options;
  const store = createBlockStore(initialBlocks);
  const sent = new Map<string, BlockSentTransaction>();
  const pendingSyncIds = new Set<string>();
  const forcedSyncIds = new Set<string>();
  let mirror: BlockSnapshotMap = new Map();
  let latestContent: PageContent = bridge.readContent();
  let isApplyingRemote = false;
  let isReadOnly = false;
  let isDestroyed = false;
  let isSyncingBlocks = false;
  let isRebasing = false;
  let rebaseFailures = 0;
  let rebaseTouched = new Set<string>();
  let coalesceTimer: ReturnType<typeof setTimeout> | null = null;
  let rebaseTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSaveState: PagesAutosaveDisplayState | null = null;
  let flushWaiters: ((didSave: boolean) => void)[] = [];

  const emitSaveState = (state: PagesAutosaveDisplayState): void => {
    if (state === lastSaveState) return;
    lastSaveState = state;
    callbacks.onSaveStateChange(state);
  };

  const resolveFlushWaiters = (didSave: boolean): void => {
    const waiters = flushWaiters;
    flushWaiters = [];
    for (const waiter of waiters) waiter(didSave);
  };

  const readSnapshotsOf = (content: PageContent): BlockSnapshotMap | null => {
    const snapshots = snapshotContent(content, pageId, spaceId);
    return snapshots.isOk() ? snapshots.getValue() : null;
  };

  const initialSnapshots = readSnapshotsOf(latestContent);
  if (initialSnapshots !== null) mirror = initialSnapshots;

  const listPendingBlockIds = (): ReadonlySet<string> =>
    listTouchedBlockIds(queue.list().flatMap((transaction) => transaction.operations));

  const enqueueGroups = (groups: readonly BlockOperationGroup[]): void => {
    for (const operations of chunkOperationGroups(groups, BLOCK_SYNC_OPERATIONS_PER_TRANSACTION_MAX)) {
      const transaction: BlockTransaction = { id: createId(), operations, spaceId };
      sent.set(transaction.id, { receipts: store.createTextReceipts(operations) });
      queue.enqueue(transaction);
    }
  };

  const flushLocal = (): void => {
    if (coalesceTimer !== null) clearTimeout(coalesceTimer);
    coalesceTimer = null;
    if (isReadOnly || isDestroyed) return;
    const next = readSnapshotsOf(latestContent);
    if (next === null) return;
    const groups = diffSnapshots({ next, pageId, previous: mirror, text: store.textWriter });
    mirror = next;
    if (groups.length > 0) enqueueGroups(groups);
  };

  const applyToEditor = (localIds: ReadonlySet<string>): void => {
    flushLocal();
    const merged = overlaySnapshots(store.readSnapshots(), mirror, new Set([...localIds, ...listPendingBlockIds()]));
    const built = buildContentFromSnapshots(merged, pageId);
    if (built.isFail()) return;
    const content = built.getValue();
    const snapshots = readSnapshotsOf(content);
    if (snapshots === null || areSnapshotMapsEqual(snapshots, mirror)) return;
    isApplyingRemote = true;
    try {
      bridge.replaceContent(content);
    } finally {
      isApplyingRemote = false;
    }
    latestContent = content;
    mirror = snapshots;
  };

  const requestPage = async (): Promise<BlockSyncResponse | null> => {
    try {
      const reply = await session.request({ pageId, type: 'sync' });
      return reply.type === 'syncResult' ? reply : null;
    } catch {
      return null;
    }
  };

  const syncPage = async (): Promise<boolean> => {
    const response = await requestPage();
    if (response === null || isDestroyed) return false;
    store.replacePage(response.blocks);
    applyToEditor(new Set());
    return true;
  };

  const listUnsentTextOperations = (groups: readonly BlockOperationGroup[]): readonly BlockWireOperation[] => {
    const covered = new Set(
      groups.flat().flatMap((operation) => {
        const args = operation.args;
        const property = typeof args === 'object' && args !== null && 'property' in args ? String(args.property) : '';
        return operation.command === 'applyText' ? [`${operation.pointer.id}:${property}`] : [];
      }),
    );
    return store.listUnconfirmedTexts().flatMap(({ blockId, property }) => {
      const value = mirror.get(blockId)?.properties[property];
      if (covered.has(`${blockId}:${property}`) || !Array.isArray(value)) return [];
      const update = store.textWriter.write(blockId, property, value);
      return update === null ? [] : [buildApplyTextOperation(blockId, property, update)];
    });
  };

  const resendAfterRebase = (): void => {
    const groups = diffSnapshots({ next: mirror, pageId, previous: store.readSnapshots(), text: store.textWriter });
    const texts = listUnsentTextOperations(groups);
    enqueueGroups([...groups, ...texts.map((operation): BlockOperationGroup => [operation])]);
  };

  const rebase = async (): Promise<void> => {
    if (isRebasing || isDestroyed) return;
    isRebasing = true;
    const didSync = await syncPageForRebase();
    isRebasing = false;
    if (didSync) {
      rebaseTouched = new Set();
      resendAfterRebase();
      return;
    }
    rebaseTimer = setTimeout(
      () => {
        rebaseTimer = null;
        void rebase();
      },
      computeCollaborationReconnectDelayMs(Math.max(rebaseFailures, 1)),
    );
  };

  const syncPageForRebase = async (): Promise<boolean> => {
    const response = await requestPage();
    if (response === null || isDestroyed) return false;
    store.replacePage(response.blocks);
    applyToEditor(rebaseTouched);
    return true;
  };

  const giveUpOnRefusal = (): void => {
    isReadOnly = true;
    emitSaveState('failed');
    callbacks.onReadOnly();
    resolveFlushWaiters(false);
  };

  const handleRejected = (transaction: BlockTransaction, error: BlockTransactionError): void => {
    if (BLOCK_SYNC_FORBIDDEN_ERROR_CODES.includes(error.code)) {
      queue.clear();
      giveUpOnRefusal();
      return;
    }
    rebaseFailures += 1;
    flushLocal();
    const dropped = queue.clear();
    rebaseTouched = new Set([
      ...rebaseTouched,
      ...listTouchedBlockIds([...transaction.operations, ...dropped.flatMap((held) => held.operations)]),
    ]);
    if (rebaseFailures > BLOCK_SYNC_REBASE_ATTEMPTS_MAX) {
      emitSaveState('failed');
      resolveFlushWaiters(false);
      return;
    }
    void rebase();
  };

  const scheduleBlockSync = (ids: readonly string[], isForced: boolean): void => {
    for (const id of ids) {
      pendingSyncIds.add(id);
      if (isForced) forcedSyncIds.add(id);
    }
    if (!isSyncingBlocks) void runBlockSync();
  };

  const runBlockSync = async (): Promise<void> => {
    isSyncingBlocks = true;
    while (pendingSyncIds.size > 0 && !isDestroyed) {
      const ids = [...pendingSyncIds];
      const requested: BlockVersion[] = ids.map((id) => ({
        id,
        version: forcedSyncIds.has(id) ? BLOCK_SYNC_FORCE_VERSION : (store.readVersion(id) ?? BLOCK_SYNC_FORCE_VERSION),
      }));
      pendingSyncIds.clear();
      forcedSyncIds.clear();
      const response = await requestChanged(requested);
      if (response === null) break;
      if (store.mergeBlocks(response).length > 0) applyToEditor(new Set());
    }
    isSyncingBlocks = false;
  };

  const requestChanged = async (requested: readonly BlockVersion[]): Promise<BlockSyncResponse | null> => {
    try {
      const reply = await session.request({ blocks: requested, type: 'sync' });
      return reply.type === 'syncResult' ? reply : null;
    } catch {
      return null;
    }
  };

  const hasWrittenTextAsProperty = (operations: readonly BlockWireOperation[]): readonly string[] =>
    operations.flatMap((operation) => {
      const args = operation.args;
      const isProperties = operation.command === 'update' && operation.path[0] === 'properties';
      const hasText =
        typeof args === 'object' &&
        args !== null &&
        Object.values(args).some((value) => Array.isArray(value) && value.length > 0);
      return isProperties && hasText ? [operation.pointer.id] : [];
    });

  const handleApplied = (transaction: BlockTransaction, blocks: readonly BlockVersion[]): void => {
    rebaseFailures = 0;
    const meta = sent.get(transaction.id);
    sent.delete(transaction.id);
    store.adoptSnapshots(listTouchedBlockIds(transaction.operations), mirror);
    const gaps = store.confirmTransaction(blocks, countOperationsByBlock(transaction.operations));
    store.confirmTexts(meta?.receipts ?? []);
    if (gaps.length > 0) scheduleBlockSync(gaps, false);
    const withoutState = hasWrittenTextAsProperty(transaction.operations);
    if (withoutState.length > 0) scheduleBlockSync(withoutState, true);
  };

  const handleQueueState = (state: BlockQueueState): void => {
    emitSaveState(BLOCK_SYNC_SAVE_STATE_BY_QUEUE_STATE[state]);
    if (state === 'idle' || state === 'backOnline') resolveFlushWaiters(true);
    if (state === 'offline') resolveFlushWaiters(false);
  };

  const send = async (transaction: BlockTransaction) => {
    const reply = await session.request({ transactions: [transaction], type: 'transactions' });
    const outcome =
      reply.type === 'transactionsResult' ? reply.transactions.find((entry) => entry.id === transaction.id) : undefined;
    if (outcome === undefined) throw new BlockLiveRequestError('unexpected-reply');
    return outcome;
  };

  const queue = createTransactionQueue({
    handlers: { onApplied: handleApplied, onRejected: handleRejected, onStateChange: handleQueueState },
    send,
  });

  const handleConnected = (): void => {
    cursor.resend();
    queue.resume();
    void syncPage();
    if (rebaseTouched.size > 0 && rebaseTimer === null) void rebase();
  };

  const handleRevoked = (): void => {
    isReadOnly = true;
    queue.clear();
    callbacks.onReadOnly();
    resolveFlushWaiters(false);
  };

  const session = options.createSession({
    onConnected: handleConnected,
    onDisconnected: () => callbacks.onParticipantsChange([]),
    onPresence: (users) =>
      callbacks.onParticipantsChange(mapPresenceToParticipants(users, localUserId ?? '', resolveParticipant)),
    onResync: () => void syncPage(),
    onRevoked: handleRevoked,
    onStatusChange: callbacks.onStatusChange,
    onVersions: (blocks) => {
      const behind = store.findBehind(blocks);
      if (behind.length > 0)
        scheduleBlockSync(
          behind.map(({ id }) => id),
          false,
        );
    },
  });
  const cursor = createCursorReporter((blockId) => session.sendPresence(blockId));

  return {
    destroy: () => {
      isDestroyed = true;
      if (coalesceTimer !== null) clearTimeout(coalesceTimer);
      if (rebaseTimer !== null) clearTimeout(rebaseTimer);
      cursor.destroy();
      queue.destroy();
      session.destroy();
      resolveFlushWaiters(false);
    },
    flush: () => {
      flushLocal();
      if (queue.size() === 0) return Promise.resolve(!isReadOnly);
      return new Promise<boolean>((resolve) => flushWaiters.push(resolve));
    },
    notifyContentChange: (content) => {
      if (isApplyingRemote || isDestroyed) return;
      latestContent = content;
      if (isReadOnly) return;
      emitSaveState('pending');
      coalesceTimer ??= setTimeout(flushLocal, BLOCK_SYNC_COALESCE_INTERVAL_MS);
    },
    reportCursor: cursor.report,
    reportSelection: (selection) => cursor.report(readBlockIdAtSelection(selection, mirror)),
  };
};
