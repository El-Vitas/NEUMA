export const ACCESS_TOKEN_REPOSITORY = Symbol('ACCESS_TOKEN_REPOSITORY');

/**
 * Cómo empieza todo token de acceso de Company Brain.
 *
 * Un prefijo propio hace que un token pegado por error en un chat o en un
 * repositorio se reconozca a simple vista y que las herramientas que buscan
 * secretos filtrados lo encuentren.
 */
export const ACCESS_TOKEN_SECRET_PREFIX = 'cbk_';

/** Bytes al azar de un token: los mismos 256 bits de una clave de firma, imposibles de adivinar. */
export const ACCESS_TOKEN_RANDOM_BYTES = 32;

/** Cuánto mide la parte al azar ya escrita en base64url, que no lleva relleno. */
export const ACCESS_TOKEN_ENCODED_RANDOM_LENGTH = Math.ceil((ACCESS_TOKEN_RANDOM_BYTES * 4) / 3);

export const ACCESS_TOKEN_ENCODED_RANDOM_PATTERN = new RegExp(
  `^[A-Za-z0-9_-]{${String(ACCESS_TOKEN_ENCODED_RANDOM_LENGTH)}}$`,
);

/** Cuánto del token se enseña para reconocerlo en una lista, sin que alcance para usarlo. */
export const ACCESS_TOKEN_DISPLAY_LENGTH = 12;

/** Cuántos tokens vivos puede tener una persona, para que una fuga no se pueda multiplicar sin límite. */
export const ACCESS_TOKEN_LIMIT_PER_USER = 20;

/**
 * Cada cuánto se anota el último uso.
 *
 * Un agente hace decenas de llamadas por minuto, y escribir en la base en cada
 * una para decir «se usó recién» es trabajo sin lector: a quien mira su lista le
 * basta saber el minuto.
 */
export const ACCESS_TOKEN_LAST_USED_RESOLUTION_MS = 60_000;

export const ACCESS_TOKENS_ROUTE = 'access-tokens';

/** La puerta de quien administra: todos los tokens del espacio de trabajo, no solo los suyos. */
export const ACCESS_TOKENS_WORKSPACE_SEGMENT = 'workspace';
