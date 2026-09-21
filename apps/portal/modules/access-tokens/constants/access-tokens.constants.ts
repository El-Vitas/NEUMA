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

/** Lo que una fila del formulario nombra cuando no es un espacio sino todos los que ve el dueño. */
export const ACCESS_TOKEN_ALL_SPACES = 'ALL';

/** Hasta cuándo sirve un token nuevo. «Nunca» es sin fecha. */
export const ACCESS_TOKEN_EXPIRY_OPTIONS = {
  never: 'NEVER',
  month: 'MONTH',
  quarter: 'QUARTER',
  year: 'YEAR',
} as const;

export const ACCESS_TOKEN_EXPIRY_VALUES = [
  ACCESS_TOKEN_EXPIRY_OPTIONS.never,
  ACCESS_TOKEN_EXPIRY_OPTIONS.month,
  ACCESS_TOKEN_EXPIRY_OPTIONS.quarter,
  ACCESS_TOKEN_EXPIRY_OPTIONS.year,
] as const;

/** Cuántos días después de hoy vence cada opción con fecha. */
export const ACCESS_TOKEN_EXPIRY_DAYS = {
  [ACCESS_TOKEN_EXPIRY_OPTIONS.month]: 30,
  [ACCESS_TOKEN_EXPIRY_OPTIONS.quarter]: 90,
  [ACCESS_TOKEN_EXPIRY_OPTIONS.year]: 365,
} as const;
