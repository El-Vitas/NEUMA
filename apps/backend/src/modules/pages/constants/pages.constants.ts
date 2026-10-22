import { PAGE_PROPERTY_KEY_MAX_LENGTH, type PageContent } from '@neuma/shared';

/** What a page that was given no content starts with: one empty paragraph. */
export const PAGE_EMPTY_CONTENT: PageContent = {
  content: [{ content: [], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

export const PAGE_ATTACHMENTS_CLEANUP_REPOSITORY = 'PAGE_ATTACHMENTS_CLEANUP_REPOSITORY';
export const PAGE_REPOSITORY = 'PAGE_REPOSITORY';
export const PAGE_PURGE_REPOSITORY = 'PAGE_PURGE_REPOSITORY';
export const PAGE_VERSION_RETENTION_REPOSITORY = 'PAGE_VERSION_RETENTION_REPOSITORY';
export const PAGE_SCHEMA_REPOSITORY = 'PAGE_SCHEMA_REPOSITORY';
export const PAGE_OUTLINE_REPOSITORY = 'PAGE_OUTLINE_REPOSITORY';
export const PAGE_TREE_REPOSITORY = 'PAGE_TREE_REPOSITORY';
/** Deeper than any real tree; bounds every walk up or down it, should a cycle appear. */
export const PAGE_TREE_MAX_DEPTH = 64;

/** The sidebar asks for the children of a page in windows (ADR 030). */
export const PAGE_TREE_DEFAULT_WINDOW = 100;
export const PAGE_TREE_MAX_WINDOW = 200;
export const PAGE_LOOKUP_MAX_IDS = 100;
/** Documents are heavy, so a lookup of content is a smaller batch. */
export const PAGE_LOOKUP_CONTENT_MAX_IDS = 20;
/** Pages offered per space while nothing is typed; what is not among them is reached by searching. */
export const PAGE_MOVE_DESTINATIONS_PER_SPACE = 20;
/** Pages a search offers as a place to move to. */
export const PAGE_MOVE_DESTINATIONS_SEARCH_LIMIT = 30;

export const PAGE_RECENT_DEFAULT_TAKE = 20;
export const PAGE_RECENT_MAX_TAKE = 50;
/** Blocks read per page asked for before they are resolved to the pages that hold them. */
export const PAGE_RECENT_BLOCKS_PER_PAGE = 4;
export const PAGE_RECENT_MAX_ROUNDS = 5;
/** What a collection has in the tree: nothing, because its rows are not listed there. */
export const PAGE_TREE_EMPTY_CHILDREN = { entries: [], total: 0 } as const;
export const PAGE_TRASH_DEFAULT_WINDOW = 50;
export const PAGE_TRASH_MAX_WINDOW = 100;

/** The columns of a block that make a page. */
export const PAGE_BLOCK_COLUMNS = [
  'children',
  'createdAt',
  'createdById',
  'editedAt',
  'editedById',
  'format',
  'id',
  'lifecycle',
  'lockedAt',
  'ownerId',
  'parentId',
  'permissions',
  'properties',
  'purgeAfter',
  'spaceId',
  'trashedAt',
  'verificationExpiresAt',
  'verifiedAt',
  'verifiedById',
  'version',
] as const;
export const MAX_APPENDED_PAGE_BLOCKS = 200;
export const PAGE_VERSION_LIST_DEFAULT_LIMIT = 20;
export const PAGE_VERSION_LIST_MAX_LIMIT = 50;
export const REDACTED_MENTION_LABEL = 'Restricted page';

/** Deleting forever only schedules it: the page stays restorable this long (ADR 017). */
export const PAGE_PURGE_DELAY_DAYS = 30;
export const PAGE_RETENTION_INTERVAL_MS = 60 * 60 * 1000;
/** Versions older than this keep one per page and day; newer ones stay as saved. */
export const PAGE_VERSION_FULL_HISTORY_DAYS = 30;
export const PAGE_PURGE_BATCH_SIZE = 100;
/** One purge at a time across processes, so two runs never delete the same pages twice. */
export const PAGE_PURGE_LOCK_KEY = 'page-purge';

export const PAGE_VERSION_CLOCK = 'PAGE_VERSION_CLOCK';

export const PAGE_QUERY_CLOCK = 'PAGE_QUERY_CLOCK';

/** Rows read in one statement to compute rollups: a bound on the list of ids the statement carries. */
export const PAGE_COMPUTED_READ_BATCH_SIZE = 1000;

/** A query that filters, sorts, groups or totals by a computed property evaluates up to this many rows (ADR 028). */
export const PAGE_COMPUTED_CANDIDATE_LIMIT = 20_000;

/** Collections read while a schema with rollups is saved; a chain is at most three long, so this is ample. */
export const REACHABLE_COLLECTIONS_LIMIT = 20;

/** The key of a column under test while a formula or rollup is checked; it never passes the pattern of a real key. */
export const PREVIEW_PROPERTY_KEY = '__preview';

/** How many rows a check is tried on: enough to see a pattern, few enough to read. */
export const PREVIEW_ROW_LIMIT = 5;

/** The zone a query is read in when the request names none. */
export const PAGE_QUERY_DEFAULT_TIME_ZONE = 'UTC';

/**
 * The live save of the old design (ADR 020) ran 250 ms after the last change and at most 2 s after the first one, and
 * each save was a version, folded into the one before it when the same person saved within five minutes. A version
 * is cut on that cadence for what the editor writes now, and the folding is the same rule.
 */
export const PAGE_VERSION_IDLE_MS = 250;
export const PAGE_VERSION_MAX_WAIT_MS = 2000;

export const PAGE_RESTORE_VERSION_OUTCOME = { missing: 'MISSING_VERSION' } as const;

/** A transaction id carries what the write is, so a retried mutation id finds its own result and no other. */
export const PAGE_TRANSACTION_KIND = {
  move: 'page-move',
  restore: 'page-restore',
  trash: 'page-trash',
} as const;

/** Each page opens its own transaction, so the whole selection at once would exhaust the connection pool. */
export const PAGE_BATCH_CONCURRENCY = 5;

/** Export folder for page attachments: one shared folder, since the same file can appear on several pages. */
export const EXPORT_ATTACHMENTS_FOLDER = 'assets';

export const EXPORT_ATTACHMENT_READS_AT_ONCE = 8;

export const EXPORT_MARKDOWN_MEDIA_TYPE = 'text/markdown; charset=utf-8';
export const EXPORT_ARCHIVE_MEDIA_TYPE = 'application/zip';

export const EXPORT_SELECTION_LIMIT = 200;

/** The whole archive is built in memory, so its attachments are capped well below the backend's 2 GB. */
export const EXPORT_MAX_ATTACHMENT_MEGABYTES = 256;

/** Same caps the portal enforces, repeated here because the portal is not the only caller. */
export const SCHEMA_PROPERTY_LIMIT = 50;
export const SCHEMA_VIEW_LIMIT = 20;

/** A property key is an identifier and stays short; its label is read. */
export const SCHEMA_PROPERTY_KEY_MAX_LENGTH = PAGE_PROPERTY_KEY_MAX_LENGTH;

/** A caller may send an id it read, or one that is not valid; the longer ones are refused before anything else. */
export const OPTION_ID_MAX_LENGTH = 64;
export const SCHEMA_LABEL_MAX_LENGTH = 120;

export const EXPORT_UNTITLED_LABEL_MAX_LENGTH = 80;

/**
 * Rows that declare permissions of their own, and so may be closed to a reader, are looked up one by one. Past this
 * many, counting exactly what the reader may see needs another plan, so the query refuses instead of guessing.
 */
export const PAGE_QUERY_RESTRICTED_ROW_LIMIT = 5000;

/** A view query that takes longer than this is cancelled, so one heavy view cannot hold the database. */
export const PAGE_QUERY_STATEMENT_TIMEOUT_MS = 5000;

/** Someone else renamed or removed the option after it was read; the write is undone to keep their change. */
export const SCHEMA_OPTION_ALREADY_MOVED = 'SCHEMA_OPTION_ALREADY_MOVED';

/** The shape changed between read and save; saving would silently overwrite the other change. */
export const SCHEMA_CHANGED_MEANWHILE = 'SCHEMA_CHANGED_MEANWHILE';

export const PAGE_DELETE_FOREVER_OUTCOMES = ['NOT_FOUND', 'NOT_TRASHED', 'SCHEDULED'] as const;
