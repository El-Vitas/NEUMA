export const SEARCH_TRIGRAM_THRESHOLD = 0.18;

/**
 * Qué tan parecida tiene que ser una palabra buscada a alguna del bloque para
 * contar como un error de tipeo.
 *
 * Se compara contra la palabra más parecida del bloque, que es más generoso que
 * comparar contra todo el texto: con el umbral de las páginas, dos palabras
 * inventadas sin nada en común ya coincidían (0,2). Medido en Postgres: una
 * letra de menos da 0,64 y dos letras cruzadas 0,375; al azar queda por debajo.
 */
export const PAGE_BLOCK_WORD_SIMILARITY_THRESHOLD = 0.3;
export const SEARCH_OUTBOX_MAX_ATTEMPTS = 5;
export const SEARCH_WORKER_IDLE_DELAY_MS = 1000;
export const SEARCH_EDITED_RANGE_VALUES = ['TODAY', 'LAST_SEVEN_DAYS', 'LAST_MONTH', 'THIS_YEAR'] as const;
export const SEARCH_MAX_AUTHOR_QUERY_LENGTH = 128;

/**
 * The largest version the index can be told about.
 *
 * A page that no longer exists has no version to compare against, and what is
 * asked for then is «forget whatever you have of it». That has to be said in a
 * number the store can actually hold: a larger one is not a bigger request, it
 * is a query that fails, and a failing removal leaves a thrown-away page
 * findable for good.
 */
export const SEARCH_MAX_VERSION_MARKER = 2_147_483_647;
