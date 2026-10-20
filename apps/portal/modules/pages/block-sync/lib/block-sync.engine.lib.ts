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
  listCreatedOrRevivedIds,
  listTouchedBlockIds,
  readListedChildId,
} from './block-sync.operations.lib';
import { mapPresenceToParticipants, readBlockIdAtSelection } from './block-sync.presence.lib';
import { createTransactionQueue } from './block-sync.queue.lib';
import {
  areSnapshotMapsEqual,
  buildContentFromSnapshots,
  findChildrenDivergence,
  overlaySnapshots,
} from './block-sync.rows.lib';
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
  let divergenceRounds = 0;
  /** The children each parent was given since it was last read back, to check where the server put them. */
  const verification = new Map<string, Set<string>>();
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

  /** The operations that turn `previous` into `next`, anchored only on blocks the server lists as live. */
  const diffAgainst = (previous: BlockSnapshotMap, next: BlockSnapshotMap): readonly BlockOperationGroup[] => {
    const pendingLive = listCreatedOrRevivedIds(queue.list().flatMap((transaction) => transaction.operations));
    return diffSnapshots({
      buried: store.readBuried(),
      canAnchor: (blockId) => store.isLive(blockId) || pendingLive.has(blockId),
      next,
      pageId,
      previous,
      text: store.textWriter,
    });
  };

  const flushLocal = (): void => {
    if (coalesceTimer !== null) clearTimeout(coalesceTimer);
    coalesceTimer = null;
    if (isReadOnly || isDestroyed) return;
    const next = readSnapshotsOf(latestContent);
    if (next === null) return;
    const groups = diffAgainst(mirror, next);
    store.bury([...mirror.values()].filter((block) => block.id !== pageId && !next.has(block.id)));
    mirror = next;
    if (groups.length > 0) enqueueGroups(groups);
  };

  const applyToEditor = (localIds: ReadonlySet<string>): void => {
    flushLocal();
    const merged = overlaySnapshots(
      store.readSnapshots(),
      mirror,
      new Set([...localIds, ...listPendingBlockIds()]),
      (blockId) => store.readBuried().has(blockId),
    );
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

  /** Sends what the server lacks of the writer's document; says saved at once when it lacks nothing. */
  const resendAfterRebase = (): void => {
    store.forgetUnconfirmedBurials();
    const groups = diffAgainst(store.readSnapshots(), mirror);
    const texts = listUnsentTextOperations(groups);
    const everything = [...groups, ...texts.map((operation): BlockOperationGroup => [operation])];
    if (everything.length === 0) {
      emitSaveState('saved');
      resolveFlushWaiters(true);
      return;
    }
    enqueueGroups(everything);
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
    emitSaveState('failed');
    rebaseFailures += 1;
    flushLocal();
    const dropped = queue.clear();
    rebaseTouched = new Set([
      ...rebaseTouched,
      ...listTouchedBlockIds([...transaction.operations, ...dropped.flatMap((held) => held.operations)]),
    ]);
    if (rebaseFailures > BLOCK_SYNC_REBASE_ATTEMPTS_MAX) {
      resolveFlushWaiters(false);
      return;
    }
    void rebase();
  };

  const requestVerification = (transaction: BlockTransaction): void => {
    for (const operation of transaction.operations) {
      if (operation.command !== 'listAfter' && operation.command !== 'listBefore') continue;
      const childId = readListedChildId(operation);
      const listed = verification.get(operation.pointer.id) ?? new Set<string>();
      verification.set(operation.pointer.id, childId === undefined ? listed : listed.add(childId));
    }
  };

  /** The server answered success; whether it listed the children where they were written is read back from it. */
  const verifyStructure = async (): Promise<void> => {
    if (queue.size() > 0 || isRebasing || isDestroyed || verification.size === 0) return;
    const checked = new Map(verification);
    verification.clear();
    const response = await requestChanged([...checked.keys()].map((id) => ({ id, version: BLOCK_SYNC_FORCE_VERSION })));
    if (response === null || queue.size() > 0) return;
    const misplaced = response.blocks.filter((block) =>
      findChildrenDivergence(
        block.children,
        mirror.get(block.id)?.children ?? block.children,
        checked.get(block.id) ?? new Set(),
      ),
    );
    if (misplaced.length > 0) {
      handleDivergence(misplaced.flatMap((block) => [block.id, ...(checked.get(block.id) ?? [])]));
      return;
    }
    divergenceRounds = 0;
    if (store.mergeBlocks(response).length > 0) applyToEditor(new Set());
  };

  /** Not what was asked: show it, read the page again and send what the server lacks, from live anchors. */
  const handleDivergence = (blockIds: readonly string[]): void => {
    emitSaveState('failed');
    divergenceRounds += 1;
    if (divergenceRounds > BLOCK_SYNC_REBASE_ATTEMPTS_MAX) {
      resolveFlushWaiters(false);
      return;
    }
    flushLocal();
    const dropped = queue.clear();
    rebaseTouched = new Set([
      ...rebaseTouched,
      ...blockIds,
      ...listTouchedBlockIds(dropped.flatMap((held) => held.operations)),
    ]);
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
    requestVerification(transaction);
    if (gaps.length > 0) scheduleBlockSync(gaps, false);
    const withoutState = hasWrittenTextAsProperty(transaction.operations);
    if (withoutState.length > 0) scheduleBlockSync(withoutState, true);
  };

  const handleQueueState = (state: BlockQueueState): void => {
    emitSaveState(BLOCK_SYNC_SAVE_STATE_BY_QUEUE_STATE[state]);
    if (state === 'idle' || state === 'backOnline') {
      resolveFlushWaiters(true);
      void verifyStructure();
    }
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
