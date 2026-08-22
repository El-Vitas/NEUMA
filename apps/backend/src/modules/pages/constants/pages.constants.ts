export const PAGE_ATTACHMENTS_CLEANUP_REPOSITORY = 'PAGE_ATTACHMENTS_CLEANUP_REPOSITORY';
export const PAGE_REPOSITORY = 'PAGE_REPOSITORY';
export const PAGE_SCHEMA_REPOSITORY = 'PAGE_SCHEMA_REPOSITORY';
export const REDACTED_MENTION_LABEL = 'Restricted page';

/**
 * The order sisters are read in.
 *
 * Two pages made at the same moment can end up carrying the same number, since
 * the next number is worked out by reading the highest one and adding to it.
 * The moment each was made breaks the tie, so a tree reads the same way twice
 * running instead of however the database felt like answering.
 */
export const PAGE_SIBLING_ORDER = [{ order: 'asc' }, { createdAt: 'asc' }] as const;

/**
 * How many pages of a batch are worked on at the same time.
 *
 * Each one opens a transaction of its own, so the whole selection at once would
 * ask for a hundred connections and there are not a hundred. A batch takes
 * longer this way; everything else keeps running while it does.
 */
export const PAGE_BATCH_CONCURRENCY = 5;

/** One page goes out as itself; several go out packed, so the folders can say what hung from what. */
export const EXPORT_MARKDOWN_MEDIA_TYPE = 'text/markdown; charset=utf-8';
export const EXPORT_ARCHIVE_MEDIA_TYPE = 'application/zip';

export const PAGE_DELETE_FOREVER_OUTCOMES = ['DELETED', 'NOT_FOUND', 'NOT_TRASHED'] as const;
