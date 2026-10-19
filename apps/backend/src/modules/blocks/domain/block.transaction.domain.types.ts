import type { BlockContent, BlockPermissions, BlockViewer, Result } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import type { BlockRecord, RecordsById, RolesById } from './block.domain.types';
import type { BLOCK_BAG_VALUES, BLOCK_LINK_KIND, BLOCK_WRITABLE_FIELD_VALUES } from './block.operation.constants';

export type BlockBag = (typeof BLOCK_BAG_VALUES)[number];

export type BlockWritableField = (typeof BLOCK_WRITABLE_FIELD_VALUES)[number];

export type BlockLinkKind = (typeof BLOCK_LINK_KIND)[keyof typeof BLOCK_LINK_KIND];

export type BlockJsonObject = Record<string, unknown>;

/** The top-level fields an operation may set, each already checked against its own schema. */
export interface BlockFieldPatch {
  readonly alive?: boolean;
  readonly format?: BlockJsonObject | null;
  readonly parentId?: string | null;
  readonly properties?: BlockJsonObject;
  readonly type?: string;
}

export interface BlockCreateFields {
  readonly format: BlockJsonObject | null;
  readonly parentId: string | null;
  readonly properties: BlockJsonObject;
  readonly type: string;
}

export interface BlockChildPlacement {
  readonly anchorId: string | null;
  readonly side: 'after' | 'before';
}

/** An operation after its envelope and its arguments were validated: one shape per thing it does. */
export type BlockOperation =
  | { readonly blockId: string; readonly command: 'create'; readonly fields: BlockCreateFields }
  | { readonly blockId: string; readonly command: 'patchFields'; readonly patch: BlockFieldPatch }
  | {
      readonly bag: BlockBag;
      readonly blockId: string;
      readonly command: 'mergeEntries';
      readonly values: BlockJsonObject;
    }
  | {
      readonly bag: BlockBag;
      readonly blockId: string;
      readonly command: 'replaceEntry';
      readonly key: string;
      readonly value: unknown;
    }
  | {
      readonly blockId: string;
      readonly childId: string;
      readonly command: 'insertChild';
      readonly placement: BlockChildPlacement;
    }
  | { readonly blockId: string; readonly childId: string; readonly command: 'removeChild' }
  | { readonly blockId: string; readonly command: 'applyText'; readonly property: string; readonly update: Uint8Array }
  | { readonly blockId: string; readonly command: 'setPermissions'; readonly permissions: BlockPermissions };

export type BlockCreateOperation = Extract<BlockOperation, { command: 'create' }>;

/** Every operation that changes a block that already exists. */
export type BlockEditOperation = Exclude<BlockOperation, { command: 'create' }>;

/** A stored block with its Yjs state, which only the write path reads. */
export interface WorkingBlock extends BlockRecord {
  readonly textState: Uint8Array | null;
}

export interface BlockLoad {
  /** Context rows (ancestors) carry no text state. */
  readonly context: readonly BlockRecord[];
  readonly isDepthExceeded: boolean;
  readonly locked: readonly WorkingBlock[];
}

export interface BlockTextUpdateInput {
  readonly property: string;
  readonly textState: Uint8Array | null;
  readonly update: Uint8Array;
}

export interface BlockTextReplaceInput {
  /** The new content of the text, as a Yjs delta. */
  readonly delta: readonly unknown[];
  readonly property: string;
  readonly textState: Uint8Array | null;
}

export interface BlockTextUpdateOutput {
  readonly textState: Uint8Array;
  readonly value: unknown;
}

/** Merges a Yjs update into a block text. The domain does not import Yjs, so the caller passes this in. */
export type BlockTextUpdateApplier = (input: BlockTextUpdateInput) => Result<BlockTextUpdateOutput, DomainError>;

/** Rewrites a block text as a Yjs edit, so a direct write and the Yjs state never drift apart. */
export type BlockTextReplacer = (input: BlockTextReplaceInput) => Result<BlockTextUpdateOutput, DomainError>;

export interface BlockTextEngine {
  readonly merge: BlockTextUpdateApplier;
  readonly replace: BlockTextReplacer;
}

export type WriteBlocker = 'locked' | 'trashed';

/** `manage` is the right to change permissions; `edit` is the right to change content. */
export type AuthorizationPower = 'edit' | 'manage';

/** The blocks as the operations left them, and how many operations each one received. */
export interface AppliedOperations {
  readonly after: ReadonlyMap<string, WorkingBlock>;
  readonly counts: ReadonlyMap<string, number>;
}

/** A block ready to store. `content` is set when the transaction changed what the block says or where it is. */
export interface SettledBlock {
  readonly block: WorkingBlock;
  readonly content: BlockContent | null;
}

export interface TreeCheckInput {
  readonly after: ReadonlyMap<string, WorkingBlock>;
  readonly before: ReadonlyMap<string, WorkingBlock>;
  readonly maxDepth: number;
  readonly recordsById: RecordsById;
  readonly touchedIds: readonly string[];
}

export interface AuthorizationInput {
  readonly before: ReadonlyMap<string, WorkingBlock>;
  readonly isSpaceReadable: boolean;
  readonly maxDepth: number;
  readonly recordsById: RecordsById;
  readonly rolesById: RolesById;
  readonly spaceId: string;
  readonly viewer: BlockViewer;
}

export interface BlockTransactionInput {
  readonly actor: BlockViewer;
  readonly isSpaceReadable: boolean;
  readonly load: BlockLoad;
  readonly maxTreeDepth: number;
  readonly now: Date;
  readonly operations: readonly BlockOperation[];
  readonly spaceId: string;
}

export interface BlockVersion {
  readonly id: string;
  readonly version: number;
}

export interface BlockWrite {
  readonly block: WorkingBlock;
  readonly isNew: boolean;
}

export interface BlockLinkDraft {
  readonly kind: BlockLinkKind;
  readonly sourceBlockId: string;
  readonly sourcePageId: string;
  readonly targetBlockId: string;
}

export interface BlockLinkTarget {
  readonly kind: BlockLinkKind;
  readonly targetBlockId: string;
}

export interface StoredBlockLink extends BlockLinkDraft {
  readonly id: string;
}

/** A block moved under a new page: the links its descendants send now belong to that page. */
export interface LinkSourceRebind {
  readonly rootBlockId: string;
  readonly sourcePageId: string;
}

export interface BlockLinkDiff {
  readonly deleteIds: readonly string[];
  readonly drafts: readonly BlockLinkDraft[];
}

/** What a transaction does once every rule passed: rows to write, links wanted and versions to report. */
export interface BlockTransactionPlan {
  readonly linkDrafts: readonly BlockLinkDraft[];
  readonly linkSourceIds: readonly string[];
  readonly rebinds: readonly LinkSourceRebind[];
  readonly versions: readonly BlockVersion[];
  readonly writes: readonly BlockWrite[];
}
