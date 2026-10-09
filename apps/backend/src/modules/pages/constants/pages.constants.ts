import { PAGE_PROPERTY_KEY_MAX_LENGTH } from '@neuma/shared';

export const PAGE_ATTACHMENTS_CLEANUP_REPOSITORY = 'PAGE_ATTACHMENTS_CLEANUP_REPOSITORY';
export const PAGE_REPOSITORY = 'PAGE_REPOSITORY';
export const PAGE_SCHEMA_REPOSITORY = 'PAGE_SCHEMA_REPOSITORY';
export const PAGE_OUTLINE_REPOSITORY = 'PAGE_OUTLINE_REPOSITORY';
export const PAGE_MAINTENANCE_REPOSITORY = 'PAGE_MAINTENANCE_REPOSITORY';
export const PAGE_MAINTENANCE_BATCH_SIZE = 100;
/** Deeper than any real tree; bounds the walk should a cycle appear. */
export const PAGE_OUTLINE_MAX_DEPTH = 64;
export const PAGE_LIVE_DOCUMENT = 'PAGE_LIVE_DOCUMENT';
export const MAX_APPENDED_PAGE_BLOCKS = 200;
export const REDACTED_MENTION_LABEL = 'Restricted page';
/** Serializes moves per workspace so two concurrent moves cannot close a cycle. */
export const PAGE_MOVES_LOCK_PREFIX = 'page-moves:';

/**
 * Concurrent creations can get the same number (next = highest + 1), so creation time
 * breaks the tie and the tree reads the same every time.
 */
export const PAGE_SIBLING_ORDER = [{ order: 'asc' }, { createdAt: 'asc' }] as const;

export const PAGE_CONTENT_STORE_OUTCOME = {
  missing: 'MISSING',
  stored: 'STORED',
  unchanged: 'UNCHANGED',
} as const;

/** Each page opens its own transaction, so the whole selection at once would exhaust the connection pool. */
export const PAGE_BATCH_CONCURRENCY = 5;

/** Export folder for page attachments: one shared folder, since the same file can appear on several pages. */
export const EXPORT_ATTACHMENTS_FOLDER = 'assets';

export const EXPORT_ATTACHMENT_READS_AT_ONCE = 8;

export const EXPORT_MARKDOWN_MEDIA_TYPE = 'text/markdown; charset=utf-8';
export const EXPORT_ARCHIVE_MEDIA_TYPE = 'application/zip';

export const EXPORT_SELECTION_LIMIT = 200;

/** Same caps the portal enforces, repeated here because the portal is not the only caller. */
export const SCHEMA_PROPERTY_LIMIT = 50;
export const SCHEMA_VIEW_LIMIT = 20;

/**
 * A title shows in the sidebar, breadcrumb and export filename, so the cap fits the
 * narrowest. A property key is an identifier and stays short; its label is read.
 */
export const PAGE_TITLE_MAX_LENGTH = 200;
export const SCHEMA_PROPERTY_KEY_MAX_LENGTH = PAGE_PROPERTY_KEY_MAX_LENGTH;
export const SCHEMA_LABEL_MAX_LENGTH = 120;

export const EXPORT_UNTITLED_LABEL_MAX_LENGTH = 80;

/**
 * Reading groups, filters and computes in one request, so an unbounded collection
 * (an inbox, a log) would cost memory and time in proportion to its size. The response
 * reports the cap rather than silently showing 500 of 1000.
 */
export const COLLECTION_ROW_LIMIT = 500;

/**
 * Filtering only the first 500 rows would miss matches further down, so a query reads up
 * to this cap and only then trims what it returns.
 */
export const COLLECTION_QUERY_ROW_LIMIT = 5000;

/** Someone else renamed or removed the option after it was read; the write is undone to keep their change. */
export const SCHEMA_OPTION_ALREADY_MOVED = 'SCHEMA_OPTION_ALREADY_MOVED';

/** The shape changed between read and save; saving would silently overwrite the other change. */
export const SCHEMA_CHANGED_MEANWHILE = 'SCHEMA_CHANGED_MEANWHILE';

export const PAGE_DELETE_FOREVER_OUTCOMES = ['DELETED', 'NOT_FOUND', 'NOT_TRASHED'] as const;
