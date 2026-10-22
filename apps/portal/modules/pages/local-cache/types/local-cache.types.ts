export interface ClientModeProperty {
  readonly key: string;
  readonly type: string;
}

export interface ClientModeInput {
  readonly estimatedBytes: number;
  readonly filterPropertyKeys: readonly string[];
  readonly groupPropertyKey: null | string;
  readonly hasSearch: boolean;
  readonly properties: readonly ClientModeProperty[];
  readonly sortPropertyKeys: readonly string[];
  readonly visibleRowCount: number;
}

export type ClientModeRefusal = 'search' | 'server-only-property' | 'too-heavy' | 'too-many-rows';

export type ClientModeDecision =
  | { readonly isClientMode: false; readonly reason: ClientModeRefusal }
  | { readonly isClientMode: true };

export interface CacheEntryUsage {
  readonly bytes: number;
  readonly key: string;
  readonly lastAccessAt: number;
}

/** What every cached record says of itself, whatever it carries. */
export interface CacheableBody {
  readonly id: string;
  /** Set when the same version can be read under another role, which then replaces it. */
  readonly role?: string;
  readonly spaceId: string;
  readonly version: number;
}

/** A record as the server last sent it, with when this browser last read it. */
export interface CachedRecord<Body extends CacheableBody> {
  readonly body: Body;
  readonly bytes: number;
  readonly readAt: number;
}

/** What a query answered, as ids to resolve against the records plus the view's own layout of them. */
export interface CachedResult {
  readonly bytes: number;
  readonly changesCursor: null | string;
  readonly collectionId: string;
  readonly ids: readonly string[];
  readonly key: string;
  /** How the view arranged the ids (groups, bands, cursors), as JSON the view's own code reads. */
  readonly layout: string;
  readonly lastAccessAt: number;
  readonly savedAt: number;
  readonly schemaVersion: number;
  readonly total: number;
  readonly validatedAt: number;
  readonly viewVersion: number;
}

export interface CacheMeta {
  readonly cacheVersion: number;
  readonly userId: string;
}

/** Why a write was set aside instead of applied; the person decides what happens to it. */
export type RejectedCause = 'forbidden' | 'invalid' | 'missing' | 'other';

export interface StoredTextPreview {
  readonly blockId: string;
  readonly property: string;
  readonly text: string;
}

/** Whose queue sends a write kept on disk: the editor's blocks, or the views of a collection. */
export type StoredTransactionKind = 'blocks' | 'view-write';

/** A write kept on disk until the server has answered it. Its id is the one every resend carries. */
export interface StoredTransaction {
  readonly attempts: number;
  /** Rises with every write, so the order they are read back in is the order they were made. */
  readonly createdAt: number;
  readonly id: string;
  /** Absent in a write kept before views had a queue: those are the editor's. */
  readonly kind?: StoredTransactionKind;
  readonly operations: readonly unknown[];
  /** The tab that is sending it; another tab may take it over once that tab is gone. */
  readonly ownerId: string;
  readonly pageId: string;
  readonly previews: readonly StoredTextPreview[];
  readonly spaceId: string;
}

export interface RejectedTransaction extends StoredTransaction {
  readonly cause: RejectedCause;
  readonly message: string;
  readonly rejectedAt: number;
}

/** The disk behind the pending writes. */
export interface OutboxStorage {
  readonly appendTransaction: (transaction: StoredTransaction) => Promise<void>;
  readonly deleteRejected: (id: string) => Promise<void>;
  readonly deleteTransaction: (id: string) => Promise<void>;
  readonly listRejected: () => Promise<readonly RejectedTransaction[]>;
  readonly listTransactions: () => Promise<readonly StoredTransaction[]>;
  readonly putRejected: (transaction: RejectedTransaction) => Promise<void>;
  readonly updateTransaction: (transaction: StoredTransaction) => Promise<void>;
}

/** The disk behind the cache. IndexedDB in the browser, memory when it is not there or in tests. */
export interface LocalCacheStorage<Body extends CacheableBody> {
  readonly clearCache: () => Promise<void>;
  readonly deleteRecords: (ids: readonly string[]) => Promise<void>;
  readonly deleteResults: (keys: readonly string[]) => Promise<void>;
  /** Empties everything, pending writes included. */
  readonly destroy: () => Promise<void>;
  readonly listRecords: () => Promise<readonly CachedRecord<Body>[]>;
  readonly listResults: () => Promise<readonly CachedResult[]>;
  readonly putRecords: (records: readonly CachedRecord<Body>[]) => Promise<void>;
  readonly putResult: (result: CachedResult) => Promise<void>;
  readonly readMeta: () => Promise<CacheMeta | null>;
  readonly writeMeta: (meta: CacheMeta) => Promise<void>;
}

export interface LocalStorageBundle<Body extends CacheableBody> {
  readonly cache: LocalCacheStorage<Body>;
  readonly outbox: OutboxStorage;
}

export interface LocalCacheOptions<Body extends CacheableBody> {
  readonly budgetBytes: number;
  readonly now: () => number;
  readonly storage: LocalCacheStorage<Body>;
  readonly userId: string;
}

export interface LocalCacheResultInput {
  readonly changesCursor: null | string;
  readonly collectionId: string;
  readonly ids: readonly string[];
  readonly key: string;
  readonly layout: string;
  readonly schemaVersion: number;
  readonly total: number;
  readonly viewVersion: number;
}

export interface LocalCacheReading<Body extends CacheableBody> {
  readonly records: readonly Body[];
  readonly result: CachedResult;
}

export interface LocalCache<Body extends CacheableBody> {
  readonly enforceBudget: (protectedKeys?: ReadonlySet<string>) => Promise<readonly string[]>;
  readonly listRecords: () => readonly Body[];
  readonly purgeRecords: (ids: readonly string[]) => Promise<void>;
  readonly purgeSpace: (spaceId: string) => Promise<void>;
  readonly readRecord: (id: string) => Body | null;
  readonly readResult: (key: string) => LocalCacheReading<Body> | null;
  readonly saveRecords: (bodies: readonly Body[]) => Promise<void>;
  readonly saveResult: (input: LocalCacheResultInput) => Promise<void>;
  readonly validateResult: (key: string, changesCursor: null | string) => Promise<void>;
  readonly wipe: () => Promise<void>;
}

export interface OutboxOptions {
  readonly now: () => number;
  readonly storage: OutboxStorage;
}

export interface Outbox {
  readonly append: (transaction: StoredTransaction) => Promise<void>;
  readonly discardRejected: (id: string) => Promise<void>;
  readonly listPending: () => Promise<readonly StoredTransaction[]>;
  readonly listRejected: () => Promise<readonly RejectedTransaction[]>;
  readonly markRejected: (id: string, cause: RejectedCause, message: string) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
}

export interface RejectedChanges {
  readonly discard: (id: string) => Promise<void>;
  readonly items: readonly RejectedTransaction[];
}

export interface BrowserLocalCache<Body extends CacheableBody> {
  readonly cache: LocalCache<Body>;
  /** False when the browser would not give a database: nothing pending survives closing the tab. */
  readonly isPersistent: boolean;
  readonly outbox: Outbox;
}
