import type { DatabaseViewType, JsonValue } from '@neuma/db';
import type {
  BlockAccessHolder,
  BlockContent,
  BlockPermissions,
  BlockViewer,
  PageLifecycle,
  PageViewConfiguration,
  PageViewOperation,
  PageViewState,
  Result,
} from '@neuma/shared';
import type { RolesById } from '../../../common/domain/block-access.domain.types';
import type { DomainError } from '../../../common/domain/domain.error';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
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
  | BlockRelationOperation
  | BlockPageOperation;

/**
 * A row points at another row through a relation property (ADR 024). Both are relative to a row, so two people who
 * add different rows to the same cell never overwrite each other. `isMirror` marks the half the backend adds on the
 * other row of a two-way relation, which needs edit access of its own.
 */
export type BlockRelationOperation =
  | {
      readonly afterId: string | null;
      readonly blockId: string;
      readonly command: 'addRelation';
      readonly isMirror?: boolean;
      readonly property: string;
      readonly targetId: string;
    }
  | {
      readonly blockId: string;
      readonly command: 'removeRelation';
      readonly isMirror?: boolean;
      readonly property: string;
      readonly targetId: string;
    };

/** How many numbers a collection must hand out for one unique id property in a transaction. */
export interface UniqueIdDemand {
  readonly collectionId: string;
  readonly count: number;
  readonly key: string;
}

export type RowCreation = Extract<BlockOperation, { command: 'create' }>;

/** What a collection fills in when a row is created in it: the starting option of each status, and its numbers. */
export interface CollectionRowRules {
  /** The properties only the server writes: unique ids, and who made a row and when it was made or edited. */
  readonly serverAssignedKeys: readonly string[];
  readonly statusDefaults: readonly { readonly key: string; readonly optionId: string }[];
  readonly uniqueIdKeys: readonly string[];
}

/** What the schema of the collections a transaction writes into says about relations and about new rows. */
export interface CollectionFacts {
  readonly relations: ReadonlyMap<string, readonly RelationProperty[]>;
  readonly rules: ReadonlyMap<string, CollectionRowRules>;
}

/** The relation properties of a collection, as the transaction needs them. */
export interface RelationProperty {
  readonly key: string;
  readonly mirrorPropertyKey: string | null;
  readonly targetCollectionId: string;
}

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
  /** Entries out and entries in of one list of the row, relative to what it holds at the moment it is written. */
  | {
      readonly add: readonly string[];
      readonly blockId: string;
      readonly command: 'changeValueList';
      readonly property: string;
      readonly remove: readonly string[];
    }
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

/** A view of a collection as the transaction holds it: locked, with the two things operations change. */
export interface StoredView {
  /** The pages the collection lists as children, in its order: where a view starts when it is first ordered by hand. */
  readonly collectionOrder: readonly string[];
  readonly configuration: Readonly<Record<string, JsonValue>>;
  readonly id: string;
  /** Null follows the order of the collection. */
  readonly manualOrder: readonly string[] | null;
  readonly name: string;
  readonly pageId: string;
  readonly type: DatabaseViewType;
  readonly version: number;
}

/** One operation of a client transaction that addresses a view instead of a block. */
export interface ViewOperationEntry {
  readonly operation: PageViewOperation;
  readonly viewId: string;
}

export interface ViewPlanInput {
  readonly authorization: AuthorizationInput;
  readonly createId: () => string;
  readonly operations: readonly ViewOperationEntry[];
  readonly schemas: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>;
  readonly views: readonly StoredView[];
}

export interface ViewPlan {
  readonly versions: readonly BlockVersion[];
  readonly writes: readonly ViewWrite[];
}

/** A view while the operations of a transaction are applied one after another, with how many it has taken. */
export interface WorkingView {
  readonly operationCount: number;
  readonly state: PageViewState;
  readonly stored: StoredView;
}

export interface ViewWrite {
  readonly configuration: PageViewConfiguration;
  readonly id: string;
  readonly manualOrder: readonly string[] | null;
  readonly version: number;
}

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
  /** Names the nodes a filter operation adds to a view; given whenever the transaction changes views. */
  readonly createNodeId?: (() => string) | undefined;
  /** Spaces other than `spaceId` that the transaction writes into and the actor was checked to read. */
  readonly extraReadableSpaceIds: readonly string[];
  readonly isSpaceReadable: boolean;
  readonly load: BlockLoad;
  readonly maxTreeDepth: number;
  /** The people of the workspace with whether they can open the space; given whenever an operation sets permissions. */
  readonly members?: readonly BlockAccessHolder[] | undefined;
  readonly now: Date;
  readonly operations: readonly BlockOperation[];
  /**
   * The row rules of the collections the operations write into. Given for a client transaction, which may not
   * write what the server assigns; left out for the backend's own, which does.
   */
  readonly guardedRules?: ReadonlyMap<string, CollectionRowRules> | undefined;
  /** The relation properties of the collections whose rows a relation operation names, by collection id. */
  readonly relationSchemas?: ReadonlyMap<string, readonly RelationProperty[]>;
  readonly spaceId: string;
  /** The properties of the collections whose views the operations change, to validate the views they leave. */
  readonly viewSchemas?: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>;
  readonly viewOperations?: readonly ViewOperationEntry[];
  /** The views the operations address, locked. */
  readonly views?: readonly StoredView[];
}

export interface PermissionsLockoutInput {
  readonly after: ReadonlyMap<string, WorkingBlock>;
  readonly maxDepth: number;
  /** Undefined when the transaction sets no permissions, so nobody was looked up. */
  readonly members: readonly BlockAccessHolder[] | undefined;
  readonly operations: readonly BlockOperation[];
  readonly recordsById: ReadonlyMap<string, BlockRecord>;
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

/** A touched block; it says when the transaction moved it to another parent or changed who may read it. */
export interface NotifiedBlock extends BlockVersion {
  readonly hasAccessChange?: true | undefined;
  /** The parent it left; null when it was at the top of its space. */
  readonly previousParentId?: string | null | undefined;
}

/** What a notice needs of a block: its version, where it hangs and who may read it. */
export interface NoticeSource extends BlockVersion {
  readonly parentId: string | null;
  readonly permissions: unknown;
}

/** A touched view and the collection it belongs to. */
export interface NotifiedView extends BlockVersion {
  readonly pageId: string;
}

/** What a transaction does once every rule passed: rows to write, links wanted and versions to report. */
export interface BlockTransactionPlan {
  readonly linkDrafts: readonly BlockLinkDraft[];
  readonly linkSourceIds: readonly string[];
  /** The touched blocks as the live channel reports them: flagged when moved or when their permissions changed. */
  readonly notices: readonly NotifiedBlock[];
  readonly rebinds: readonly LinkSourceRebind[];
  /** The lists of top-level pages that changed. */
  readonly spaceWrites: readonly SpaceRoots[];
  readonly versions: readonly BlockVersion[];
  readonly viewNotices: readonly NotifiedView[];
  readonly viewVersions: readonly BlockVersion[];
  readonly viewWrites: readonly ViewWrite[];
  readonly writes: readonly BlockWrite[];
}
