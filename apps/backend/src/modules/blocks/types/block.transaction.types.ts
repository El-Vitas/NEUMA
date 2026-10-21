import type { DatabasePropertyType, JsonValue, NeumaTransaction } from '@neuma/db';
import type { Result } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import type { BlockWriteWithin } from '../../../common/types/block-writer.types';
import type {
  BlockLinkDiff,
  BlockLoad,
  BlockOperation,
  BlockVersion,
  BlockWrite,
  CollectionFacts,
  LinkSourceRebind,
  SpaceRoots,
  StoredBlockLink,
  StoredView,
  ViewOperationEntry,
  ViewWrite,
} from '../domain/block.transaction.domain.types';

export type BlockParsedOperation = Result<BlockOperation, DomainError>;

/** What one request asks, read: the block operations and the operations on views, each in the order sent. */
export interface ParsedOperations {
  readonly operations: readonly BlockOperation[];
  readonly viewOperations: readonly ViewOperationEntry[];
}

/** The operations of a request told apart by what they address. */
export interface PartitionedOperations {
  readonly blocks: readonly unknown[];
  readonly views: readonly unknown[];
}

/** Reads the operations of one request into their typed form. */
export type BlockOperationReader = (raw: readonly unknown[]) => Result<BlockOperation[], DomainError>;

/** Who sends the operations: a client is held to what the server assigns, the backend itself is not. */
export interface BlockWriteChannel {
  readonly guardsServerAssigned: boolean;
  readonly readOperations: BlockOperationReader;
  readonly within?: BlockWriteWithin | undefined;
}

/** An operation whose envelope was checked and whose arguments are still to be read by its command. */
export interface BlockOperationEnvelope {
  readonly args: unknown;
  readonly command: string;
  readonly path: string[];
  readonly pointer: { readonly id: string; readonly table: string };
}

/** One position of a rich text: a UTF-16 unit of text or an embed, with the marks it carries. */
export interface BlockTextUnit {
  readonly attributes: Record<string, unknown> | undefined;
  readonly attributesKey: string;
  readonly key: string;
  readonly value: Record<string, unknown> | string;
}

export interface BlockInsertArgs {
  readonly anchorId: string | null;
  readonly childId: string;
}

/** What a client transaction left behind; it is also what a retry gets back. */
export interface BlockTransactionResult {
  readonly blocks: readonly BlockVersion[];
  readonly id: string;
  /** The views the transaction changed, with their new versions. */
  readonly views: readonly BlockVersion[];
}

/** A property of a collection as the schema table stores it, before it is read into what a transaction needs. */
export interface StoredSchemaProperty {
  readonly config: JsonValue | null;
  readonly key: string;
  readonly options: JsonValue | null;
  readonly pageId: string;
  readonly type: DatabasePropertyType;
}

export interface BlockTransactionRequest {
  readonly id: string;
  readonly operations: readonly unknown[];
  readonly spaceId: string;
}

export type BlockTransactionOutcome =
  | BlockTransactionResult
  | {
      readonly error: { readonly code: string; readonly details?: unknown; readonly message: string };
      readonly id: string;
    };

export interface BlockTransactionsResponse {
  readonly transactions: readonly BlockTransactionOutcome[];
}

export type BlockTransactionClaim =
  | { readonly kind: 'fresh' }
  | { readonly kind: 'replayed'; readonly result: BlockTransactionResult }
  | { readonly kind: 'taken' };

/** The statements of one Postgres transaction, called inside `run` in the order the service decides. */
export interface BlockTransactionSession {
  claim(transactionId: string, userId: string, spaceId: string): Promise<BlockTransactionClaim>;
  /** The relation properties and the row rules of these collections, read in the transaction that writes into them. */
  readCollectionFacts(collectionIds: readonly string[]): Promise<CollectionFacts>;
  /** Moves the counter of a unique id forward by `count` and returns the first number it handed out. */
  takeUniqueIds(collectionId: string, key: string, count: number): Promise<number>;
  listDescendantIds(rootIds: readonly string[]): Promise<string[]>;
  /** Holds the named spaces too, because a transaction that changes their lists of top-level pages must be alone. */
  loadBlocks(blockIds: readonly string[], spaceIds: readonly string[]): Promise<BlockLoad>;
  lockTreeMoves(spaceId: string): Promise<void>;
  /** Locks the named views in id order and reads them. Blocks are locked first, so the two never wait in a circle. */
  lockViews(viewIds: readonly string[]): Promise<StoredView[]>;
  notify(payload: string): Promise<void>;
  /** The collection each view belongs to, read without a lock, to know which blocks the views' operations need. */
  readViewPageIds(viewIds: readonly string[]): Promise<ReadonlyMap<string, string>>;
  /** The properties of these collections, to check the views an operation leaves. */
  readCollectionSchemas(pageIds: readonly string[]): Promise<ReadonlyMap<string, readonly SchemaPropertyDefinition[]>>;
  /** Puts new rows at the end of the manual order of the views of their collection that have one. */
  appendRowsToViewOrders(rows: readonly { readonly pageId: string; readonly rowId: string }[]): Promise<void>;
  writeViews(writes: readonly ViewWrite[]): Promise<void>;
  readLinks(sourceBlockIds: readonly string[]): Promise<StoredBlockLink[]>;
  rebindLinkSources(rebinds: readonly LinkSourceRebind[]): Promise<void>;
  recordResult(result: BlockTransactionResult): Promise<void>;
  writeBlocks(writes: readonly BlockWrite[]): Promise<void>;
  writeLinks(diff: BlockLinkDiff): Promise<void>;
  writeSpaces(spaces: readonly SpaceRoots[]): Promise<void>;
}

export interface BlockTransactionRepositoryContract {
  /** Commits when `work` returns a value and rolls everything back when it returns a failure. */
  run<Value>(
    work: (session: BlockTransactionSession) => Promise<Result<Value, DomainError>>,
  ): Promise<Result<Value, DomainError>>;
  /** The same work inside a transaction the caller holds; the caller commits it, or rolls it back on a failure. */
  runWithin<Value>(
    transaction: NeumaTransaction,
    work: (session: BlockTransactionSession) => Promise<Result<Value, DomainError>>,
  ): Promise<Result<Value, DomainError>>;
}
