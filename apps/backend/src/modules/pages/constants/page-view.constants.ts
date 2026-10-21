/** Parks a view under a name no one can choose while the tabs take their new names, so a swap never collides. */
export const TAB_RENAME_PREFIX = '\u001F';

/** What the pipeline answers a reader who cannot see or change the collection; both read as no access. */
export const VIEW_OPERATION_DENIED_CODES: readonly string[] = ['BLOCK_ACCESS_DENIED', 'BLOCK_EDIT_FORBIDDEN'];

export const MOST_VIEW_OPERATIONS_PER_CALL = 50;
