import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenPermission } from '@company-brain/shared';

export const ACCESS_TOKENS_CACHE_TAG = 'access-tokens';

export const ACCESS_TOKEN_API_ROUTES = {
  access: (tokenId: string) => `/api/v1/access-tokens/${tokenId}/access`,
  item: (tokenId: string) => `/api/v1/access-tokens/${tokenId}`,
  list: '/api/v1/access-tokens',
  workspace: '/api/v1/access-tokens/workspace',
  workspaceItem: (tokenId: string) => `/api/v1/access-tokens/workspace/${tokenId}`,
} as const;

/** Dónde se conecta un agente por HTTP, dicho relativo al servidor para mostrarlo junto a su dirección. */
export const MCP_HTTP_PATH = '/api/v1/mcp';

/** El nombre con que el agente ve este servidor en su configuración. */
export const MCP_SERVER_KEY = 'company-brain';

/** Cómo habla el agente con el servidor: HTTP, no un proceso local. */
export const ACCESS_TOKEN_MCP_TRANSPORT = 'http';

/** Cuántos espacios lleva cada nivel de la configuración que se copia, para que se lea al pegarla. */
export const ACCESS_TOKEN_MCP_CONFIG_INDENT = 2;

/** Qué clase de lugar nombra una fila del formulario. */
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

/** Cómo se nombra un lugar que no tiene nombre propio: todos los espacios, o una página todavía sin elegir. */
export const ACCESS_TOKEN_UNNAMED_TARGET_MESSAGE_KEYS = {
  [ACCESS_TOKEN_TARGET_KINDS.all]: 'allSpaces',
  [ACCESS_TOKEN_TARGET_KINDS.page]: 'form.pageNotChosen',
  [ACCESS_TOKEN_TARGET_KINDS.space]: 'form.spaceNotChosen',
} as const;

/** Cómo se escribe la clave de un lugar, para que cada uno aparezca una sola vez entre las filas. */
export const ACCESS_TOKEN_TARGET_KEY_SEPARATOR = ':';

/** Cuántas letras hay que escribir antes de buscar páginas: con menos, cualquier cosa coincide. */
export const ACCESS_TOKEN_PAGE_SEARCH_MIN_LENGTH = 2;

/** Cuántas páginas se ofrecen por búsqueda. */
export const ACCESS_TOKEN_PAGE_SEARCH_LIMIT = 10;

/** En qué está la búsqueda de páginas, para decir algo útil cuando no hay qué mostrar. */
export const ACCESS_TOKEN_PAGE_SEARCH_STATES = {
  empty: 'EMPTY',
  failed: 'FAILED',
  found: 'FOUND',
  searching: 'SEARCHING',
  tooShort: 'TOO_SHORT',
} as const;

/** El texto que acompaña cada estado de la búsqueda de páginas cuando no hay resultados que mostrar. */
export const ACCESS_TOKEN_PAGE_SEARCH_MESSAGE_KEYS = {
  [ACCESS_TOKEN_PAGE_SEARCH_STATES.empty]: 'pageSearchEmpty',
  [ACCESS_TOKEN_PAGE_SEARCH_STATES.failed]: 'pageSearchError',
  [ACCESS_TOKEN_PAGE_SEARCH_STATES.found]: 'pageSearchEmpty',
  [ACCESS_TOKEN_PAGE_SEARCH_STATES.searching]: 'pageSearching',
  [ACCESS_TOKEN_PAGE_SEARCH_STATES.tooShort]: 'pageSearchHint',
} as const;

/** Hasta cuándo sirve un token nuevo. «Nunca» es sin fecha; «personalizada», el día que se elija. */
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

/** Cómo se lee la fecha de un campo de fecha: año, mes y día. */
export const ACCESS_TOKEN_DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Cuántas cifras llevan el mes y el día en un campo de fecha. */
export const ACCESS_TOKEN_DATE_PART_LENGTH = 2;

/**
 * El vencimiento que trae un token nuevo. Un mes, como en GitHub: un token
 * olvidado deja de servir solo, y quien lo quiere por más tiempo lo elige.
 */
export const ACCESS_TOKEN_DEFAULT_EXPIRY = ACCESS_TOKEN_EXPIRY_OPTIONS.month;

/** La clave del texto que nombra cada permiso, porque el valor lleva dos puntos y la clave no puede. */
export const ACCESS_TOKEN_PERMISSION_MESSAGE_KEYS: Readonly<Record<AccessTokenPermission, string>> = {
  [ACCESS_TOKEN_PERMISSIONS.pagesRead]: 'pagesRead',
  [ACCESS_TOKEN_PERMISSIONS.pagesWrite]: 'pagesWrite',
  [ACCESS_TOKEN_PERMISSIONS.pagesTrash]: 'pagesTrash',
  [ACCESS_TOKEN_PERMISSIONS.pagesManage]: 'pagesManage',
  [ACCESS_TOKEN_PERMISSIONS.collectionsRead]: 'collectionsRead',
  [ACCESS_TOKEN_PERMISSIONS.collectionsWrite]: 'collectionsWrite',
  [ACCESS_TOKEN_PERMISSIONS.collectionsConfigure]: 'collectionsConfigure',
};

/** Lo que sigue al comienzo visible del token en la lista, para que se note que no está completo. */
export const ACCESS_TOKEN_PREFIX_ELLIPSIS = '…';

/** Cuántos días después de hoy vence cada opción con fecha. */
export const ACCESS_TOKEN_EXPIRY_DAYS = {
  [ACCESS_TOKEN_EXPIRY_OPTIONS.month]: 30,
  [ACCESS_TOKEN_EXPIRY_OPTIONS.quarter]: 90,
  [ACCESS_TOKEN_EXPIRY_OPTIONS.year]: 365,
} as const;
