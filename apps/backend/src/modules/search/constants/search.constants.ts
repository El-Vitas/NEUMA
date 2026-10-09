export const SEARCH_TRIGRAM_THRESHOLD = 0.18;

/** Los umbrales de pg_trgm que usan sus operadores `%` y `<<%`, los que el índice de trigramas sabe atender. */
export const SEARCH_SIMILARITY_SETTING = 'pg_trgm.similarity_threshold';
export const SEARCH_STRICT_WORD_SIMILARITY_SETTING = 'pg_trgm.strict_word_similarity_threshold';

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
/** Desde cuántas letras lo buscado se busca también dentro de otras palabras. Menos que eso está dentro de casi todo. */
export const SEARCH_INSIDE_WORD_MIN_LENGTH = 3;

/** Los signos que `ILIKE` lee como comodines o como escape; en lo buscado valen como letras. */
export const SEARCH_LIKE_SPECIAL_SIGNS = /[\\%_]/g;

/**
 * Cómo se ordena lo encontrado. Lo que tiene lo buscado como palabra entera va
 * primero, de más a menos parecido; después, lo que lo tiene dentro de una
 * palabra más larga en el título; al final, dentro de una palabra del texto.
 */
export const SEARCH_WHOLE_WORD_RANK = 1;
export const SEARCH_INSIDE_TITLE_RANK = 0.5;
export const SEARCH_INSIDE_TEXT_RANK = 0.25;

/** Con esta normalización el parecido de Postgres queda entre 0 y 1, y no pasa por encima de los escalones de arriba. */
export const SEARCH_TEXT_RANK_NORMALIZATION = 32;

export const SEARCH_OUTBOX_MAX_ATTEMPTS = 5;
export const SEARCH_WORKER_IDLE_DELAY_MS = 1000;

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
