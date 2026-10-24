export const PAGE_TREE_API_ROUTES = {
  ancestors: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/ancestors`,
  children: (spaceId: string, query: string) => `/api/v1/spaces/${spaceId}/pages/tree?${query}`,
  lookup: '/api/v1/pages/lookup',
  lookupContent: '/api/v1/pages/lookup-content',
  path: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/path`,
  recent: (spaceId: string, take: number) => `/api/v1/spaces/${spaceId}/pages/recent?take=${String(take)}`,
} as const;

/** The backend answers the children of a page in windows of this size, and the show more row asks for the next. */
export const PAGE_TREE_WINDOW_SIZE = 100;

/** The most a single request may ask the backend for. */
export const PAGE_TREE_MAX_WINDOW_SIZE = 200;

/** The windows one batch may read at once, so a reload of a long-open sidebar stays one request. */
export const PAGE_TREE_MAX_BATCH_WINDOWS = 20;

/** Deeper than any real tree; bounds every walk, should a cycle appear. */
export const PAGE_TREE_MAX_DEPTH = 64;

/** The most ids a lookup carries, and a lookup of content; the backend refuses more. */
export const PAGE_LOOKUP_MAX_IDS = 100;
export const PAGE_LOOKUP_CONTENT_MAX_IDS = 20;

/** The key of the top of a space in the branches of its state. */
export const PAGE_TREE_ROOT_KEY = 'root';

/** Changes that arrive together are read once. */
export const PAGE_TREE_RELOAD_DEBOUNCE_MS = 150;

export const PAGE_RECENT_LIMIT = 20;

/** What a destination picker lists once something is written: enough to choose from. */
export const PAGE_DESTINATION_SEARCH_LIMIT = 30;

export const PAGE_TREE_EMPTY_SPACE_STATE = { branches: {}, entries: {} } as const;

export const PAGE_TREE_INITIAL_STORE_STATE = { loadingKeys: [], spaces: {} } as const;

/** What a page draws of the others when they could not be read: their names, as the document wrote them. */
export const EMPTY_PAGE_REFERENCES_READ = { references: [], relatedRows: [], syncedSources: [] } as const;

/** A page drawn without a sidebar around it has no windows to hand to one. */
export const EMPTY_PAGE_TREE_LEVELS: readonly never[] = [];

/** What the sidebar shows for a space whose pages could not be read. */
export const EMPTY_TREE_ROOTS = { entries: [], total: 0 } as const;

/** The blocks that name another page by `attrs.pageId`. A button names one only when it opens or makes a page there. */
export const PAGE_REFERENCE_NODE_TYPES: ReadonlySet<string> = new Set([
  'button',
  'collection',
  'mention',
  'subpage',
  'synced',
]);

export const PAGE_SYNCED_NODE_TYPES: ReadonlySet<string> = new Set(['synced']);
