export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';

export const JWT_SECRET_KEY = 'JWT_SECRET';
export const JWT_ACCESS_TOKEN_EXPIRES_IN_KEY = 'JWT_ACCESS_TOKEN_EXPIRES_IN';
export const JWT_DEFAULT_ACCESS_TOKEN_EXPIRES_IN = '15m';
export const JWT_REFRESH_TOKEN_EXPIRES_IN_KEY = 'JWT_REFRESH_TOKEN_EXPIRES_IN';
export const JWT_DEFAULT_REFRESH_TOKEN_EXPIRES_IN = '7d';
export const REFRESH_TOKEN_AUDIENCE = 'refresh';
/** The JWT kinds share one secret; a distinct audience keeps refresh and collaboration tokens from opening the API. */
export const ACCESS_TOKEN_AUDIENCE = 'access';
export const DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS = 900;
export const DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS = 604_800;
export const COLLABORATION_TOKEN_PURPOSE = 'collaboration';
export const COLLABORATION_TOKEN_AUDIENCE = 'collaboration';
export const COLLABORATION_TOKEN_EXPIRES_IN = '5m';

/** The scheme is case-insensitive (RFC 7235 §2.1) and may be followed by several spaces. */
export const BEARER_AUTHORIZATION_PATTERN = /^bearer +(\S+) *$/i;
