import type { PageContent } from '@neuma/shared';
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs';
import { decodeBase64, encodeBase64 } from '@/modules/pages/block-sync/lib/block-sync.base64.lib';
import { BlockLiveRequestError } from '@/modules/pages/block-sync/lib/block-sync.errors.lib';
import type {
  BlockLiveReply,
  BlockLiveRequestMessage,
  BlockLiveSession,
  BlockLiveSessionHandlers,
  BlockSyncResponse,
  BlockTransaction,
  BlockTransactionOutcome,
  BlockVersion,
  BlockWireOperation,
  SyncedBlock,
} from '@/modules/pages/block-sync/types/block-sync.types';
import { PAGE_ID, SPACE_ID, syncedBlocksOf } from './block-sync.fixtures';

interface ServerBlock {
  alive: boolean;
  children: string[];
  doc: Doc;
  format: Record<string, unknown>;
  id: string;
  parentId: string | null;
  properties: Record<string, unknown>;
  type: string;
  version: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const patchFields = (block: ServerBlock, args: Record<string, unknown>): void => {
  if (typeof args.alive === 'boolean') block.alive = args.alive;
  if (typeof args.parentId === 'string' || args.parentId === null) block.parentId = args.parentId;
  if (typeof args.type === 'string') block.type = args.type;
};

const resolveInsertIndex = (listLength: number, anchorIndex: number, isAfter: boolean): number => {
  if (anchorIndex === -1) return isAfter ? listLength : 0;
  return isAfter ? anchorIndex + 1 : anchorIndex;
};

const createServerBlock = (id: string, args: Record<string, unknown>): ServerBlock => {
  const doc = new Doc();
  const rawProperties = isRecord(args.properties) ? args.properties : {};
  const properties = Object.fromEntries(Object.entries(rawProperties).filter(([, value]) => !isRichText(value)));
  for (const [key, value] of Object.entries(rawProperties)) {
    if (isRichText(value)) doc.getText(key).applyDelta([...value]);
  }
  return {
    alive: true,
    children: [],
    doc,
    format: isRecord(args.format) ? { ...args.format } : {},
    id,
    parentId: typeof args.parentId === 'string' ? args.parentId : null,
    properties,
    type: String(args.type),
    version: 0,
  };
};

/** A small stand-in for the backend: it applies operations like the real one, with one Yjs document per block. */
export class FakeBlockServer {
  readonly blocks = new Map<string, ServerBlock>();
  readonly receivedTransactionIds: string[] = [];
  readonly syncRequests: string[] = [];
  private readonly results = new Map<string, BlockTransactionOutcome>();
  private failures: string[] = [];

  constructor(content: PageContent) {
    for (const block of syncedBlocksOf(content)) {
      const doc = new Doc();
      if (block.textState !== null) applyUpdate(doc, decodeBase64(block.textState));
      const properties = Object.fromEntries(Object.entries(block.properties).filter(([, value]) => !isRichText(value)));
      this.blocks.set(block.id, {
        alive: true,
        children: [...block.children],
        doc,
        format: { ...block.format },
        id: block.id,
        parentId: block.parentId,
        properties,
        type: block.type,
        version: block.version,
      });
    }
  }

  failNextTransaction(code: string): void {
    this.failures.push(code);
  }

  toSynced(block: ServerBlock): SyncedBlock {
    const properties: Record<string, unknown> = { ...block.properties };
    for (const key of block.doc.share.keys()) properties[key] = block.doc.getText(key).toDelta();
    return {
      alive: block.alive,
      children: block.children,
      format: block.format,
      id: block.id,
      parentId: block.parentId,
      properties,
      role: 'full',
      spaceId: SPACE_ID,
      textState: block.doc.share.size === 0 ? null : encodeBase64(encodeStateAsUpdate(block.doc)),
      type: block.type,
      version: block.version,
    };
  }

  /** What a page load would have handed the client, without counting as a request. */
  readBlocks(): readonly SyncedBlock[] {
    return [...this.blocks.values()].filter((block) => block.alive).map((block) => this.toSynced(block));
  }

  syncPage(): BlockSyncResponse {
    this.syncRequests.push('page');
    return { blocks: [...this.blocks.values()].filter((block) => block.alive).map((block) => this.toSynced(block)) };
  }

  syncChanged(requested: readonly BlockVersion[]): BlockSyncResponse {
    this.syncRequests.push(requested.map((entry) => entry.id).join(','));
    const blocks: SyncedBlock[] = [];
    const revoked: string[] = [];
    for (const { id, version } of requested) {
      const block = this.blocks.get(id);
      if (block === undefined || !block.alive) revoked.push(id);
      else if (block.version > version) blocks.push(this.toSynced(block));
    }
    return { blocks, revoked };
  }

  versions(): readonly BlockVersion[] {
    return [...this.blocks.values()].map((block) => ({ id: block.id, version: block.version }));
  }

  /** Another person types: the text of a block changes and its version goes up. */
  editTextAsSomeoneElse(
    blockId: string,
    property: string,
    edit: (insert: (index: number, value: string) => void) => void,
  ): BlockVersion {
    const block = this.require(blockId);
    const text = block.doc.getText(property);
    edit((index, value) => text.insert(index, value));
    block.version += 1;
    return { id: blockId, version: block.version };
  }

  readText(blockId: string, property: string): string {
    return this.require(blockId).doc.getText(property).toString();
  }

  readChildren(blockId: string): readonly string[] {
    return this.require(blockId).children;
  }

  apply(transaction: BlockTransaction): BlockTransactionOutcome {
    this.receivedTransactionIds.push(transaction.id);
    const stored = this.results.get(transaction.id);
    if (stored !== undefined) return stored;
    const failure = this.failures.shift();
    if (failure !== undefined) return { error: { code: failure, message: failure }, id: transaction.id };
    const touched = new Map<string, number>();
    for (const operation of transaction.operations) this.applyOperation(operation, touched);
    const outcome: BlockTransactionOutcome = {
      blocks: [...touched.keys()].map((id) => ({ id, version: this.require(id).version })),
      id: transaction.id,
    };
    this.results.set(transaction.id, outcome);
    return outcome;
  }

  private require(blockId: string): ServerBlock {
    const block = this.blocks.get(blockId);
    if (block === undefined) throw new Error(`The fake server has no block ${blockId}`);
    return block;
  }

  private touch(touched: Map<string, number>, block: ServerBlock): void {
    block.version += 1;
    touched.set(block.id, (touched.get(block.id) ?? 0) + 1);
  }

  private applyOperation(operation: BlockWireOperation, touched: Map<string, number>): void {
    const args = isRecord(operation.args) ? operation.args : {};
    if (operation.command === 'set') {
      const block = createServerBlock(operation.pointer.id, args);
      this.blocks.set(block.id, block);
      this.touch(touched, block);
      return;
    }
    const block = this.require(operation.pointer.id);
    this.touch(touched, block);
    switch (operation.command) {
      case 'update':
        this.applyUpdateOperation(block, operation.path, args);
        return;
      case 'listAfter':
      case 'listBefore':
        this.placeChild(block, operation.command, args);
        return;
      case 'listRemove':
        block.children = block.children.filter((id) => id !== args.id);
        return;
      case 'applyText':
        this.applyTextOperation(block, args);
        return;
      default:
        throw new Error(`The fake server does not know ${operation.command}`);
    }
  }

  private applyUpdateOperation(block: ServerBlock, path: readonly string[], args: Record<string, unknown>): void {
    const [bag] = path;
    if (bag === 'properties' || bag === 'format') {
      const target = bag === 'properties' ? block.properties : block.format;
      for (const [key, value] of Object.entries(args)) {
        if (value === null) delete target[key];
        else if (isRichText(value)) this.replaceText(block, key, value);
        else target[key] = value;
      }
      return;
    }
    patchFields(block, args);
  }

  private replaceText(block: ServerBlock, key: string, segments: readonly unknown[]): void {
    const text = block.doc.getText(key);
    text.delete(0, text.length);
    text.applyDelta([...segments]);
  }

  private placeChild(block: ServerBlock, command: 'listAfter' | 'listBefore', args: Record<string, unknown>): void {
    const childId = String(args.id);
    const rest = block.children.filter((id) => id !== childId);
    const anchor = command === 'listAfter' ? args.after : args.before;
    const anchorIndex = typeof anchor === 'string' ? rest.indexOf(anchor) : -1;
    const insertAt = resolveInsertIndex(rest.length, anchorIndex, command === 'listAfter');
    block.children = [...rest.slice(0, insertAt), childId, ...rest.slice(insertAt)];
  }

  private applyTextOperation(block: ServerBlock, args: Record<string, unknown>): void {
    applyUpdate(block.doc, decodeBase64(String(args.update)));
  }
}

const isRichText = (value: unknown): value is readonly unknown[] =>
  Array.isArray(value) && value.length > 0 && value.every((segment) => isRecord(segment) && 'insert' in segment);

export const PAGE_BLOCK_ID = PAGE_ID;

/** The session as the engine sees it, wired to the fake server. Tests decide when it is connected. */
export class FakeSession implements BlockLiveSession {
  isConnected = false;
  readonly presenceSent: (string | null)[] = [];
  readonly requests: BlockLiveRequestMessage[] = [];
  requestFailure: string | null = null;
  isDestroyed = false;

  constructor(
    readonly server: FakeBlockServer,
    readonly handlers: BlockLiveSessionHandlers,
  ) {}

  connect(): void {
    this.isConnected = true;
    this.handlers.onStatusChange('connected');
    this.handlers.onConnected();
  }

  disconnect(): void {
    this.isConnected = false;
    this.handlers.onStatusChange('reconnecting');
    this.handlers.onDisconnected();
  }

  request = (message: BlockLiveRequestMessage): Promise<BlockLiveReply> => {
    this.requests.push(message);
    if (!this.isConnected) return Promise.reject(new BlockLiveRequestError('closed'));
    if (this.requestFailure !== null) {
      const code = this.requestFailure;
      this.requestFailure = null;
      return Promise.reject(new BlockLiveRequestError(code));
    }
    if (message.type === 'transactions') {
      return Promise.resolve({
        transactions: message.transactions.map((transaction) => this.server.apply(transaction)),
        type: 'transactionsResult',
      });
    }
    const response = 'pageId' in message ? this.server.syncPage() : this.server.syncChanged(message.blocks);
    return Promise.resolve({ type: 'syncResult', ...response });
  };

  sendPresence = (blockId: string | null): void => {
    this.presenceSent.push(blockId);
  };

  destroy = (): void => {
    this.isDestroyed = true;
  };
}
