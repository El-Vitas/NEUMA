import { applyUpdate, Doc, decodeStateVector, encodeStateAsUpdate, encodeStateVector } from 'yjs';
import { BLOCK_SYNC_COMMAND, BLOCK_SYNC_KEY_SEPARATOR } from '../constants/block-sync.constants';
import type {
  BlockSnapshot,
  BlockSnapshotMap,
  BlockStore,
  BlockSyncResponse,
  BlockTextReceipt,
  BlockVersion,
  BlockWireOperation,
  SyncedBlock,
} from '../types/block-sync.types';
import { decodeBase64, encodeBase64 } from './block-sync.base64.lib';
import { isRichTextValue } from './block-sync.snapshot.lib';
import { editTextToSegments, mergeStateVectors, readTextSegments } from './block-sync.text.lib';

const toKey = (blockId: string, property: string): string => `${blockId}${BLOCK_SYNC_KEY_SEPARATOR}${property}`;

const readVectorOf = (doc: Doc): Map<number, number> => decodeStateVector(encodeStateVector(doc));

const toSnapshot = (block: SyncedBlock): BlockSnapshot => ({
  children: block.children,
  format: block.format ?? {},
  id: block.id,
  parentId: block.parentId,
  properties: block.properties,
  type: block.type,
});

/**
 * What this client knows of the server's blocks: their last read content and versions, and one Yjs document per
 * block. The documents also hold the writer's own edits, so what is read from them is the text as the writer sees it.
 */
export const createBlockStore = (initialBlocks: readonly SyncedBlock[]): BlockStore => {
  const snapshots = new Map<string, BlockSnapshot>();
  const versions = new Map<string, number>();
  const roles = new Map<string, string>();
  const docs = new Map<string, Doc>();
  const confirmedVectors = new Map<string, Map<number, number>>();
  const dirtyRevisions = new Map<string, number>();
  let revisionCounter = 0;

  const ensureDoc = (blockId: string): Doc => {
    const existing = docs.get(blockId);
    if (existing !== undefined) return existing;
    const created = new Doc();
    docs.set(blockId, created);
    return created;
  };

  const absorbTextState = (blockId: string, textState: string | null): void => {
    if (textState === null) return;
    const doc = ensureDoc(blockId);
    const bytes = decodeBase64(textState);
    applyUpdate(doc, bytes);
    const serverDoc = new Doc();
    applyUpdate(serverDoc, bytes);
    confirmedVectors.set(
      blockId,
      mergeStateVectors(confirmedVectors.get(blockId) ?? new Map(), readVectorOf(serverDoc)),
    );
  };

  const forget = (blockId: string): void => {
    snapshots.delete(blockId);
    versions.delete(blockId);
    roles.delete(blockId);
  };

  const upsert = (block: SyncedBlock): void => {
    snapshots.set(block.id, toSnapshot(block));
    versions.set(block.id, block.version);
    roles.set(block.id, block.role);
    absorbTextState(block.id, block.textState);
  };

  const isKnownAtLeast = (block: SyncedBlock): boolean => (versions.get(block.id) ?? -1) >= block.version;

  /** True when the block was known, so dropping it is a change. */
  const dropBlock = (blockId: string): boolean => {
    const wasKnown = snapshots.has(blockId);
    forget(blockId);
    return wasKnown;
  };

  const mergeBlock = (block: SyncedBlock): boolean => {
    if (!block.alive) return dropBlock(block.id);
    if (isKnownAtLeast(block)) return false;
    upsert(block);
    return true;
  };

  const mergeBlocks = (response: BlockSyncResponse): readonly string[] => [
    ...response.blocks.filter(mergeBlock).map((block) => block.id),
    ...(response.revoked ?? []).filter(dropBlock),
  ];

  const replacePage = (blocks: readonly SyncedBlock[]): readonly string[] => {
    const incoming = new Set(blocks.map((block) => block.id));
    const dropped = [...snapshots.keys()].filter((id) => !incoming.has(id));
    for (const id of dropped) forget(id);
    const changed = blocks.filter((block) => !isKnownAtLeast(block)).map((block) => block.id);
    for (const block of blocks) if (block.alive) upsert(block);
    return [...dropped, ...changed];
  };

  const hasServerText = (blockId: string, property: string): boolean => {
    const value = snapshots.get(blockId)?.properties[property];
    return isRichTextValue(value) && value.length > 0;
  };

  const canWrite = (blockId: string, property: string): boolean =>
    docs.get(blockId)?.share.has(property) === true || !hasServerText(blockId, property);

  const write: BlockStore['textWriter']['write'] = (blockId, property, next) => {
    const doc = ensureDoc(blockId);
    const key = toKey(blockId, property);
    if (editTextToSegments(doc, property, next)) {
      revisionCounter += 1;
      dirtyRevisions.set(key, revisionCounter);
    }
    if (!dirtyRevisions.has(key)) return null;
    const confirmed = confirmedVectors.get(blockId);
    return encodeBase64(encodeStateAsUpdate(doc, confirmed === undefined ? undefined : encodeStateVector(confirmed)));
  };

  const readSnapshots = (): BlockSnapshotMap => {
    const merged = new Map<string, BlockSnapshot>();
    for (const [id, snapshot] of snapshots) {
      const doc = docs.get(id);
      const textProperties = doc === undefined ? [] : [...doc.share.keys()];
      const properties: Record<string, unknown> = { ...snapshot.properties };
      for (const property of textProperties) properties[property] = readTextSegments(doc ?? new Doc(), property);
      merged.set(id, { ...snapshot, properties });
    }
    return merged;
  };

  const confirmTransaction = (
    blocks: readonly BlockVersion[],
    operationCounts: ReadonlyMap<string, number>,
  ): readonly string[] => {
    const toSync: string[] = [];
    for (const { id, version } of blocks) {
      const known = versions.get(id) ?? 0;
      if (version <= known) continue;
      if (version === known + (operationCounts.get(id) ?? 0)) versions.set(id, version);
      else toSync.push(id);
    }
    return toSync;
  };

  const adoptSnapshots = (ids: Iterable<string>, adopted: BlockSnapshotMap): void => {
    for (const id of ids) {
      const snapshot = adopted.get(id);
      if (snapshot === undefined) snapshots.delete(id);
      else snapshots.set(id, snapshot);
    }
  };

  const createTextReceipts = (operations: readonly BlockWireOperation[]): readonly BlockTextReceipt[] =>
    operations.flatMap((operation): BlockTextReceipt[] => {
      if (operation.command !== BLOCK_SYNC_COMMAND.applyText) return [];
      const args = operation.args;
      const property = typeof args === 'object' && args !== null && 'property' in args ? String(args.property) : '';
      const blockId = operation.pointer.id;
      const doc = docs.get(blockId);
      if (doc === undefined) return [];
      return [{ blockId, property, revision: dirtyRevisions.get(toKey(blockId, property)), vector: readVectorOf(doc) }];
    });

  const confirmTexts = (receipts: readonly BlockTextReceipt[]): void => {
    for (const receipt of receipts) {
      confirmedVectors.set(
        receipt.blockId,
        mergeStateVectors(confirmedVectors.get(receipt.blockId) ?? new Map(), receipt.vector),
      );
      const key = toKey(receipt.blockId, receipt.property);
      if (dirtyRevisions.get(key) === receipt.revision) dirtyRevisions.delete(key);
    }
  };

  for (const block of initialBlocks) if (block.alive) upsert(block);

  return {
    adoptSnapshots,
    confirmTexts,
    confirmTransaction,
    createTextReceipts,
    findBehind: (requested) =>
      requested
        .filter(({ id, version }) => version > (versions.get(id) ?? 0))
        .map(({ id }) => ({ id, version: versions.get(id) ?? 0 })),
    listUnconfirmedTexts: () =>
      [...dirtyRevisions.keys()].map((key) => {
        const [blockId = '', property = ''] = key.split(BLOCK_SYNC_KEY_SEPARATOR);
        return { blockId, property };
      }),
    mergeBlocks,
    readRole: (blockId) => roles.get(blockId) ?? null,
    readSnapshots,
    readVersion: (blockId) => versions.get(blockId),
    replacePage,
    textWriter: { canWrite, write },
  };
};
