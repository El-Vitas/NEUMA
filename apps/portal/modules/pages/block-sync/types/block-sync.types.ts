import type { BlockRichText, PageContent } from '@neuma/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { Selection } from 'prosemirror-state';
import type { z } from 'zod';
import type { PagesAutosaveDisplayState } from '../../types/pages.autosave.types';
import type { CollaborationStatus, PageCollaborationParticipant } from '../../types/pages.collaboration.types';
import type { BLOCK_SYNC_BAG, BLOCK_SYNC_COMMAND } from '../constants/block-sync.constants';
import type { blockLiveServerMessageSchema } from '../schemas/block-sync.schemas';

export type BlockJsonObject = Readonly<Record<string, unknown>>;

/** A block as the editor document says it is: its place in the tree and its content. */
export interface BlockSnapshot {
  readonly children: readonly string[];
  readonly format: BlockJsonObject;
  readonly id: string;
  readonly parentId: string | null;
  readonly properties: BlockJsonObject;
  readonly type: string;
}

export type BlockSnapshotMap = ReadonlyMap<string, BlockSnapshot>;

/** A block as the server sends it, with the Yjs state of its text as base64. */
export interface SyncedBlock extends BlockSnapshot {
  readonly alive: boolean;
  /** True when the block declares its own access; who is on it is told only to those with full access. */
  readonly hasOwnPermissions?: boolean;
  readonly role: string;
  readonly spaceId: string;
  readonly textState: string | null;
  readonly version: number;
}

export interface BlockVersion {
  readonly id: string;
  readonly version: number;
}

export interface BlockSyncResponse {
  readonly blocks: readonly SyncedBlock[];
  readonly revoked?: readonly string[];
}

export type BlockCommand = (typeof BLOCK_SYNC_COMMAND)[keyof typeof BLOCK_SYNC_COMMAND];

export type BlockBag = (typeof BLOCK_SYNC_BAG)[keyof typeof BLOCK_SYNC_BAG];

export interface BlockWireOperation {
  readonly args: unknown;
  readonly command: BlockCommand;
  readonly path: readonly string[];
  readonly pointer: { readonly id: string; readonly table: 'block' };
}

/** Operations that only make sense together, such as creating a block and listing it in its parent. */
export type BlockOperationGroup = readonly BlockWireOperation[];

export interface BlockTransaction {
  readonly id: string;
  readonly operations: readonly BlockWireOperation[];
  readonly spaceId: string;
}

export interface BlockTransactionError {
  readonly code: string;
  readonly details?: unknown;
  readonly message: string;
}

export type BlockTransactionOutcome =
  | { readonly blocks: readonly BlockVersion[]; readonly id: string }
  | { readonly error: BlockTransactionError; readonly id: string };

/** Reads and writes the text of the blocks, which live in one Yjs document per block. */
export interface BlockTextWriter {
  /** False when the server holds text for the block that this client has no Yjs history of. */
  readonly canWrite: (blockId: string, property: string) => boolean;
  /** Edits the local text to the new one and returns the update the server lacks, or null when there is none. */
  readonly write: (blockId: string, property: string, next: BlockRichText) => string | null;
}

/** What was sent of one text, so that only that much is taken as confirmed when the server answers. */
export interface BlockTextReceipt {
  readonly blockId: string;
  readonly property: string;
  readonly revision: number | undefined;
  readonly vector: ReadonlyMap<number, number>;
}

export interface BlockStore {
  /** Takes the content the editor said for these blocks as known, once the server accepted it. */
  readonly adoptSnapshots: (ids: Iterable<string>, adopted: BlockSnapshotMap) => void;
  /** Remembers blocks this client just removed, as they were, so that one that comes back is revived. */
  readonly bury: (removed: readonly BlockSnapshot[]) => void;
  readonly confirmTexts: (receipts: readonly BlockTextReceipt[]) => void;
  /** Drops the dead blocks the server never heard of, such as one made and deleted in a lost transaction. */
  readonly forgetUnconfirmedBurials: () => void;
  /** True for a block the server lists as live, as far as this client has read or written. */
  readonly isLive: (blockId: string) => boolean;
  readonly readBuried: () => ReadonlyMap<string, BlockSnapshot>;
  /** Takes the versions of a transaction as known; names the blocks that moved more than this client moved them. */
  readonly confirmTransaction: (
    blocks: readonly BlockVersion[],
    operationCounts: ReadonlyMap<string, number>,
  ) => readonly string[];
  readonly createTextReceipts: (operations: readonly BlockWireOperation[]) => readonly BlockTextReceipt[];
  readonly findBehind: (announced: readonly BlockVersion[]) => readonly BlockVersion[];
  readonly listUnconfirmedTexts: () => readonly { readonly blockId: string; readonly property: string }[];
  readonly mergeBlocks: (response: BlockSyncResponse) => readonly string[];
  readonly readRole: (blockId: string) => string | null;
  readonly readSnapshots: () => BlockSnapshotMap;
  readonly readVersion: (blockId: string) => number | undefined;
  readonly replacePage: (blocks: readonly SyncedBlock[]) => readonly string[];
  readonly textWriter: BlockTextWriter;
}

export interface BlockPresenceUser {
  readonly blockId: string | null;
  readonly expiresAt: number;
  readonly userId: string;
}

export interface BlockLiveSocket {
  readonly close: (code?: number) => void;
  readonly listen: (handlers: BlockLiveSocketHandlers) => void;
  readonly send: (text: string) => void;
}

export interface BlockLiveSocketHandlers {
  readonly onClose: (code: number) => void;
  readonly onMessage: (text: string) => void;
  readonly onOpen: () => void;
}

export type BlockLiveRequestMessage =
  | { readonly transactions: readonly BlockTransaction[]; readonly type: 'transactions' }
  | { readonly pageId: string; readonly type: 'sync' }
  | { readonly blocks: readonly BlockVersion[]; readonly type: 'sync' };

export type BlockLiveReply =
  | { readonly transactions: readonly BlockTransactionOutcome[]; readonly type: 'transactionsResult' }
  | ({ readonly type: 'syncResult' } & BlockSyncResponse);

export interface BlockLiveSessionHandlers {
  readonly onConnected: () => void;
  readonly onDisconnected: () => void;
  readonly onPresence: (users: readonly BlockPresenceUser[]) => void;
  readonly onResync: () => void;
  readonly onRevoked: () => void;
  readonly onStatusChange: (status: CollaborationStatus) => void;
  readonly onVersions: (blocks: readonly BlockVersion[]) => void;
}

export interface BlockLiveSessionOptions {
  readonly handlers: BlockLiveSessionHandlers;
  /** A discussion of a block of this page changed; the page reads its discussions again. */
  readonly onDiscussionChanged?: () => void;
  readonly openSocket: (url: string) => BlockLiveSocket;
  readonly pageId: string;
  readonly requestToken: () => Promise<string | null>;
  readonly url: string;
}

export interface BlockLiveSession {
  readonly destroy: () => void;
  readonly request: (message: BlockLiveRequestMessage) => Promise<BlockLiveReply>;
  readonly sendPresence: (blockId: string | null) => void;
}

export interface BlockTransactionQueueHandlers {
  readonly onApplied: (transaction: BlockTransaction, blocks: readonly BlockVersion[]) => void;
  readonly onRejected: (transaction: BlockTransaction, error: BlockTransactionError) => void;
  readonly onStateChange: (state: BlockQueueState) => void;
}

export type BlockQueueState = 'backOnline' | 'idle' | 'offline' | 'saving';

export interface BlockTransactionQueueOptions {
  readonly handlers: BlockTransactionQueueHandlers;
  readonly send: (transaction: BlockTransaction) => Promise<BlockTransactionOutcome>;
}

export interface BlockTransactionQueue {
  readonly clear: () => readonly BlockTransaction[];
  readonly destroy: () => void;
  readonly enqueue: (transaction: BlockTransaction) => void;
  readonly list: () => readonly BlockTransaction[];
  readonly resume: () => void;
  readonly size: () => number;
}

/** The editor, seen from the engine: it reads the document it holds and replaces it when others change it. */
export interface BlockSyncEditorBridge {
  readonly readContent: () => PageContent;
  readonly replaceContent: (content: PageContent) => void;
}

export interface BlockSyncCallbacks {
  readonly onParticipantsChange: (participants: readonly PageCollaborationParticipant[]) => void;
  readonly onReadOnly: () => void;
  readonly onSaveStateChange: (state: PagesAutosaveDisplayState) => void;
  readonly onStatusChange: (status: CollaborationStatus) => void;
}

export interface BlockSyncEngineOptions {
  readonly bridge: BlockSyncEditorBridge;
  readonly callbacks: BlockSyncCallbacks;
  readonly createId: () => string;
  readonly createSession: (handlers: BlockLiveSessionHandlers) => BlockLiveSession;
  readonly initialBlocks: readonly SyncedBlock[];
  /** A viewer receives what others do, and never sends a transaction or a cursor. */
  readonly isViewer?: boolean;
  readonly localUserId: string | null;
  readonly pageId: string;
  readonly resolveParticipant: (userId: string) => PageCollaborationParticipantIdentity;
  readonly spaceId: string;
}

export interface PageCollaborationParticipantIdentity {
  readonly color: string | null;
  readonly name: string;
}

/** What the block editor starts from: null blocks and content mean it is off, or `isFailed` says it could not start. */
export interface BlockEditorStart {
  readonly blocks: readonly SyncedBlock[] | null;
  readonly content: PageContent | null;
  readonly isFailed: boolean;
}

export interface CursorReporter {
  readonly destroy: () => void;
  readonly report: (blockId: string | null) => void;
  /** Sends the last block again, as after a reconnection, when there is one. */
  readonly resend: () => void;
}

export interface BlockListPlacement {
  readonly after?: string;
  /** No sibling to anchor on: ask for the start of the list rather than the end. */
  readonly atStart?: boolean;
  readonly before?: string;
  readonly childId: string;
}

export interface BlockDiffInput {
  /** Blocks the server holds dead, as they were: one that comes back is revived, never created. */
  readonly buried?: ReadonlyMap<string, BlockSnapshot>;
  /** False for a sibling the server does not list as live; a list operation is never anchored on one. */
  readonly canAnchor?: (blockId: string) => boolean;
  readonly next: BlockSnapshotMap;
  readonly pageId: string;
  readonly previous: BlockSnapshotMap;
  readonly text: BlockTextWriter;
}

export interface BlockSentTransaction {
  readonly receipts: readonly BlockTextReceipt[];
}

export type BlockSendResult =
  | { readonly code: string; readonly kind: 'failed' }
  | { readonly kind: 'answered'; readonly outcome: BlockTransactionOutcome };

/** A node of the editor document with the position it starts at. */
export interface BlockFoundNode {
  readonly node: EditorNode;
  readonly position: number;
}

/** Where a position was: the block around it and how far into that block. */
export interface BlockSelectionAnchor {
  readonly blockId: string;
  readonly offset: number;
}

export interface BlockChangedRange {
  readonly currentEnd: number;
  readonly nextEnd: number;
  readonly start: number;
}

export interface BlockPendingRequest {
  readonly reject: (error: Error) => void;
  readonly resolve: (reply: BlockLiveReply) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/** One position of a rich text: a UTF-16 unit of text or an embed, with the marks it carries. */
export interface BlockTextUnit {
  readonly attributes: Record<string, unknown>;
  readonly key: string;
  readonly value: Record<string, unknown> | string;
}

export interface BlockDeltaOperation {
  readonly attributes?: Record<string, unknown>;
  readonly delete?: number;
  readonly insert?: Record<string, unknown> | string;
  readonly retain?: number;
}

export type BlockLiveServerMessage = z.infer<typeof blockLiveServerMessageSchema>;

export interface BlockSyncEngine {
  readonly destroy: () => void;
  readonly flush: () => Promise<boolean>;
  readonly notifyContentChange: (content: PageContent) => void;
  readonly reportCursor: (blockId: string | null) => void;
  /** Tells the block the selection is in, as `reportCursor` does for a block id. */
  readonly reportSelection: (selection: Selection) => void;
}
