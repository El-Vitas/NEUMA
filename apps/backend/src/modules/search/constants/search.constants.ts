export const SEARCH_TRIGRAM_THRESHOLD = 0.18;

/**
 * Qué tan parecida tiene que ser una palabra buscada a una palabra entera del
 * bloque para contar como un error de tipeo.
 *
 * Se compara palabra contra palabra entera, no contra un pedazo cualquiera del
 * texto: así «vendor» no se confunde con «Venn» ni «proveedor» con «editor».
 * Medido en Postgres sobre los bloques reales: lo que no tenía nada que ver
 * quedó en 0,33 o menos, y una letra de más o de menos («despliege»,
 * «arquitectra», «lanzamento») entre 0,62 y 0,67. El costo: dos letras cruzadas
 * («raodmap») dan 0,33, igual que el ruido, y ya no se encuentran.
 */
export const PAGE_BLOCK_WORD_SIMILARITY_THRESHOLD = 0.45;
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
