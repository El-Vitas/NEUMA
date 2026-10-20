import type { BlockContent, BlockPermissions, BlockViewer, PageLifecycle, Result } from '@neuma/shared';
import type { RolesById } from '../../../common/domain/block-access.domain.types';
import type { DomainError } from '../../../common/domain/domain.error';
import type { BlockRecord, RecordsById } from './block.domain.types';
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
  | {
      readonly blockId: string;
      readonly command: 'insertRoot';
      readonly placement: BlockChildPlacement;
      readonly spaceId: string;
    }
  | { readonly blockId: string; readonly command: 'removeRoot'; readonly spaceId: string }
  | { readonly blockId: string; readonly command: 'applyText'; readonly property: string; readonly update: Uint8Array }
  | { readonly blockId: string; readonly command: 'setPermissions'; readonly permissions: BlockPermissions }
  | BlockPageOperation;

/**
 * What only the backend sends, for a page. `detachFromParentId` names the parent that still lists the page and must
 * stop listing it, because the page leaves it: a restored page whose parent is in the trash goes to the root, and a
 * page that changes space leaves its old parent in the old space.
 */
export type BlockPageOperation =
  | {
      readonly blockId: string;
      readonly command: 'setLifecycle';
      readonly detachFromParentId: string | null;
      readonly lifecycle: PageLifecycle;
    }
  | { readonly blockId: string; readonly command: 'setLock'; readonly isLocked: boolean }
  | {
      readonly blockId: string;
      readonly command: 'setVerification';
      readonly expiresAt: Date | null;
      readonly isVerified: boolean;
    }
  | { readonly blockId: string; readonly command: 'setOwner'; readonly ownerId: string | null }
  | { readonly blockId: string; readonly command: 'mergePageValues'; readonly values: BlockJsonObject }
  /** The same merge, for a change of the shape of the collection: a lock or the trash does not stop it. */
  | { readonly blockId: string; readonly command: 'rewritePageValues'; readonly values: BlockJsonObject }
  | {
      readonly blockId: string;
      readonly command: 'moveToSpaceRoot';
      /** The sibling the page goes right after in its new place; null puts it last. */
      readonly afterId: string | null;
      readonly detachFromParentId: string | null;
      /** The page of the new space that holds it; null puts it at the top of the space. */
      readonly parentId: string | null;
      readonly spaceId: string;
    }
  | { readonly blockId: string; readonly command: 'followToSpace'; readonly spaceId: string };

export type BlockCreateOperation = Extract<BlockOperation, { command: 'create' }>;

/** Every operation that changes a block that already exists. */
export type BlockEditOperation = Exclude<BlockOperation, { command: 'create' }>;

export interface PageOperationAuthor {
  readonly now: Date;
  readonly userId: string;
}

/** The operations the planner applies, and the pages whose new place was already decided by the command itself. */
export interface ExpandedOperations {
  readonly operations: readonly BlockOperation[];
  readonly placedIds: ReadonlySet<string>;
}

/** The columns that only a page carries. A block that does not carry them leaves what is stored alone. */
export interface BlockPageColumns {
  readonly lockedById: string | null;
  readonly ownerId: string | null;
  readonly purgeAfter: Date | null;
  readonly trashedAt: Date | null;
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly verifiedById: string | null;
}

/**
 * A stored block with its Yjs state, which only the write path reads. `page` is there when the block was read whole;
 * a block without it leaves the page columns of the row alone when it is stored.
 */
export interface WorkingBlock extends BlockRecord {
  readonly page?: BlockPageColumns;
  readonly textState: Uint8Array | null;
}

/** The ordered top-level pages of a space, held while a transaction changes them. */
export interface SpaceRoots {
  readonly id: string;
  readonly rootPageIds: readonly string[];
}

/** The lists of top-level pages while a transaction works on them, by space. */
export type RootLists = Map<string, string[]>;

export interface BlockLoad {
  /** Context rows (ancestors) carry no text state. */
  readonly context: readonly BlockRecord[];
  readonly isDepthExceeded: boolean;
  readonly locked: readonly WorkingBlock[];
  /** The spaces whose lists of top-level pages the transaction may change, locked. */
  readonly spaces: readonly SpaceRoots[];
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
  /** Spaces other than `spaceId` that the transaction writes into and the actor was checked to read. */
  readonly extraReadableSpaceIds: readonly string[];
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
  /** The lists of top-level pages that changed. */
  readonly spaceWrites: readonly SpaceRoots[];
  readonly versions: readonly BlockVersion[];
  readonly writes: readonly BlockWrite[];
}
