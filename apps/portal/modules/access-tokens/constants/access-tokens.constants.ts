import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenPermission } from '@neuma/shared';

export const ACCESS_TOKENS_CACHE_TAG = 'access-tokens';

export const ACCESS_TOKEN_API_ROUTES = {
  access: (tokenId: string) => `/api/v1/access-tokens/${tokenId}/access`,
  item: (tokenId: string) => `/api/v1/access-tokens/${tokenId}`,
  list: '/api/v1/access-tokens',
  workspace: '/api/v1/access-tokens/workspace',
  workspaceItem: (tokenId: string) => `/api/v1/access-tokens/workspace/${tokenId}`,
} as const;

export const MCP_SERVER_KEY = 'neuma';

export const ACCESS_TOKEN_MCP_TRANSPORT = 'http';

export const ACCESS_TOKEN_MCP_CONFIG_INDENT = 2;

export const ACCESS_TOKEN_TARGET_KINDS = {
  all: 'ALL',
  page: 'PAGE',
  space: 'SPACE',
} as const;

export const ACCESS_TOKEN_TARGET_KIND_VALUES = [
  ACCESS_TOKEN_TARGET_KINDS.all,
  ACCESS_TOKEN_TARGET_KINDS.space,
  ACCESS_TOKEN_TARGET_KINDS.page,
] as const;

export const ACCESS_TOKEN_UNNAMED_TARGET_MESSAGE_KEYS = {
  [ACCESS_TOKEN_TARGET_KINDS.all]: 'allSpaces',
  [ACCESS_TOKEN_TARGET_KINDS.page]: 'form.pageNotChosen',
  [ACCESS_TOKEN_TARGET_KINDS.space]: 'form.spaceNotChosen',
} as const;

export const ACCESS_TOKEN_TARGET_KEY_SEPARATOR = ':';

/** Shorter queries match almost anything. */
export const ACCESS_TOKEN_PAGE_SEARCH_MIN_LENGTH = 2;

export const ACCESS_TOKEN_PAGE_SEARCH_LIMIT = 10;

export const ACCESS_TOKEN_PAGE_SEARCH_STATES = {
  empty: 'EMPTY',
  failed: 'FAILED',
  found: 'FOUND',
  searching: 'SEARCHING',
  tooShort: 'TOO_SHORT',
} as const;

export const ACCESS_TOKEN_PAGE_SEARCH_MESSAGE_KEYS = {
  [ACCESS_TOKEN_PAGE_SEARCH_STATES.empty]: 'pageSearchEmpty',
  [ACCESS_TOKEN_PAGE_SEARCH_STATES.failed]: 'pageSearchError',
  [ACCESS_TOKEN_PAGE_SEARCH_STATES.found]: 'pageSearchEmpty',
  [ACCESS_TOKEN_PAGE_SEARCH_STATES.searching]: 'pageSearching',
  [ACCESS_TOKEN_PAGE_SEARCH_STATES.tooShort]: 'pageSearchHint',
} as const;

export const ACCESS_TOKEN_EXPIRY_OPTIONS = {
  never: 'NEVER',
  month: 'MONTH',
  quarter: 'QUARTER',
  year: 'YEAR',
  custom: 'CUSTOM',
} as const;

export const ACCESS_TOKEN_EXPIRY_VALUES = [
  ACCESS_TOKEN_EXPIRY_OPTIONS.never,
  ACCESS_TOKEN_EXPIRY_OPTIONS.month,
  ACCESS_TOKEN_EXPIRY_OPTIONS.quarter,
  ACCESS_TOKEN_EXPIRY_OPTIONS.year,
  ACCESS_TOKEN_EXPIRY_OPTIONS.custom,
] as const;

export const ACCESS_TOKEN_DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const ACCESS_TOKEN_DATE_PART_LENGTH = 2;

/** One month, so a forgotten token stops working on its own. */
export const ACCESS_TOKEN_DEFAULT_EXPIRY = ACCESS_TOKEN_EXPIRY_OPTIONS.month;

/** Permission values contain a colon, which a message key cannot. */
export const ACCESS_TOKEN_PERMISSION_MESSAGE_KEYS: Readonly<Record<AccessTokenPermission, string>> = {
  [ACCESS_TOKEN_PERMISSIONS.pagesRead]: 'pagesRead',
  [ACCESS_TOKEN_PERMISSIONS.pagesWrite]: 'pagesWrite',
  [ACCESS_TOKEN_PERMISSIONS.pagesTrash]: 'pagesTrash',
  [ACCESS_TOKEN_PERMISSIONS.pagesManage]: 'pagesManage',
  [ACCESS_TOKEN_PERMISSIONS.collectionsRead]: 'collectionsRead',
  [ACCESS_TOKEN_PERMISSIONS.collectionsWrite]: 'collectionsWrite',
  [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure]: 'collectionsConfigure',
};

export const ACCESS_TOKEN_PREFIX_ELLIPSIS = '…';

export const ACCESS_TOKEN_EXPIRY_DAYS = {
  [ACCESS_TOKEN_EXPIRY_OPTIONS.month]: 30,
  [ACCESS_TOKEN_EXPIRY_OPTIONS.quarter]: 90,
  [ACCESS_TOKEN_EXPIRY_OPTIONS.year]: 365,
} as const;
