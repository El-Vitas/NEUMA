export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';

export const JWT_SECRET_KEY = 'JWT_SECRET';
export const JWT_ACCESS_TOKEN_EXPIRES_IN_KEY = 'JWT_ACCESS_TOKEN_EXPIRES_IN';
export const JWT_DEFAULT_ACCESS_TOKEN_EXPIRES_IN = '15m';
export const JWT_REFRESH_TOKEN_EXPIRES_IN_KEY = 'JWT_REFRESH_TOKEN_EXPIRES_IN';
export const JWT_DEFAULT_REFRESH_TOKEN_EXPIRES_IN = '7d';
export const REFRESH_TOKEN_AUDIENCE = 'refresh';
/**
 * La audiencia de la llave que abre la API. Las tres llaves se firman con el
 * mismo secreto; sin una audiencia propia, la de renovar —que dura días— o la
 * del documento en vivo también abrirían la API.
 */
export const ACCESS_TOKEN_AUDIENCE = 'access';
export const DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS = 900;
export const DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS = 604_800;
export const COLLABORATION_TOKEN_PURPOSE = 'collaboration';
export const COLLABORATION_TOKEN_AUDIENCE = 'collaboration';
export const COLLABORATION_TOKEN_EXPIRES_IN = '5m';

/**
 * La cabecera que trae una llave. El esquema no distingue mayúsculas (RFC 7235
 * §2.1), y entre el esquema y la llave puede haber más de un espacio.
 */
export const BEARER_AUTHORIZATION_PATTERN = /^bearer +(\S+) *$/i;
