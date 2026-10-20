/** Caps the listed backlinks; the total count is reported separately. */
export const BACKLINKS_LIST_LIMIT = 100;

/** Links mean mentions only, as the old projection counted them: not subpages, synced sources or collections. */
export const LINK_KIND_MENTION = 'mention';

/** Caps the outgoing links of one page read before the viewer's permissions filter them. */
export const LINKS_SCAN_LIMIT = 2000;

export const EMPTY_LINKS_RESULT = { count: 0, items: [] } as const;
