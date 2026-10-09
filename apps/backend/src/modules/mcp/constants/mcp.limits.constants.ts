import {
  maximumBookmarkTextLength,
  maximumFormulaLatexLength,
  maximumPageTextLength,
  maximumTableColumns,
  maximumTableRows,
  maximumToggleSummaryLength,
} from '@company-brain/shared';

/** Cuántas páginas cuyo título coincide se suman a una búsqueda; lo fino lo dan los bloques. */
export const MCP_SEARCH_PAGE_TITLE_LIMIT = 5;

/** Cuántas páginas que enlazan a otra se muestran al abrirla. */
export const MCP_FETCH_BACKLINK_LIMIT = 20;

/**
 * Cuánto Markdown entrega `fetch` de una vez. Una página más larga sigue en el
 * tramo siguiente: entregarla entera se comería la conversación del agente.
 */
export const MCP_FETCH_PART_MAX_CHARACTERS = 60_000;

/** Cuántos comentarios de una página se entregan al abrirla. */
export const MCP_FETCH_COMMENT_LIMIT = 200;

/** Cuántas páginas de las que cuelgan de una se nombran al abrirla; las demás se recorren con list_pages. */
export const MCP_FETCH_CHILD_LIMIT = 100;

/** El largo del nombre de un tipo de bloque, para filtrar la búsqueda por él. */
export const MCP_BLOCK_TYPE_MAX_LENGTH = 64;

/**
 * De a cuántas páginas lista `list_pages`, y hasta cuántas se le pueden pedir.
 * Un espacio con cientos de páginas en la raíz, entregado de una vez, pasa el
 * tope de lo que el agente recibe de una herramienta y lo pierde entero.
 */
export const MCP_LISTED_PAGE_PART_DEFAULT = 50;
export const MCP_LISTED_PAGE_PART_MAX = 200;

/** Cuántos cambios de una misma clase —columnas, opciones, valores— se piden en una llamada. */
export const MCP_COLLECTION_CHANGE_LIMIT = 50;

/** Cuántas condiciones y cuántos órdenes lleva una consulta o una vista: los mismos que acepta una vista. */
export const MCP_WHERE_CONDITION_LIMIT = 20;
export const MCP_SORT_RULE_LIMIT = 5;

/** El largo del nombre de una columna, una opción o una clave. */
export const MCP_COLUMN_NAME_MAX_LENGTH = 100;

/** El largo de un valor de texto en una celda. */
export const MCP_VALUE_TEXT_MAX_LENGTH = 500;

/** El largo de lo que dice la página de una fila al crearla. */
export const MCP_ROW_TEXT_MAX_LENGTH = 20_000;

/** Cuántas páginas se listan de una vez desde un mismo padre. */
export const MCP_LISTED_PAGE_LIMIT = 1000;

/** Cuántos espacios se listan: más de los que un espacio de trabajo tiene, y un tope para la respuesta. */
export const MCP_LISTED_SPACE_LIMIT = 1000;

/** Cuántas páginas de la papelera se muestran de una vez; para encontrar una entre más, se busca por su título. */
export const MCP_TRASH_LISTED_MAX = 50;

/** Hasta cuántos pasos tiene la ruta de una página, o la de encabezados de un bloque. */
export const MCP_PATH_MAX_DEPTH = 64;

/** El largo de un enlace o un id que el agente pasa para abrir algo. */
export const MCP_ADDRESS_MAX_LENGTH = 2048;

/** El largo del id que el agente le da a un pedido: alcanza para un UUID o una clave propia. */
export const MCP_REQUEST_ID_MAX_LENGTH = 128;

/** El largo de un título de página. */
export const MCP_TITLE_MAX_LENGTH = 200;

/** Lo que dice, como mucho, el título o la descripción de una tarjeta de enlace: el mismo tope que acepta la página. */
export const MCP_BOOKMARK_TEXT_MAX_LENGTH = maximumBookmarkTextLength;

/** Cuántas columnas se ponen lado a lado; más que eso no cabe a lo ancho de una página. */
export const MCP_COLUMNS_MAX = 4;

/** Lo que ocupa, como mucho, el emoji de una página: el mismo tope que acepta la página. */
export const MCP_PAGE_ICON_MAX_LENGTH = 16;

/** Cuántos bloques se escriben o se señalan en una llamada. */
export const MCP_BLOCKS_PER_WRITE = 100;

/** El largo del texto de un bloque, el mismo tope que tiene un texto en una página. */
export const MCP_BLOCK_TEXT_MAX_LENGTH = maximumPageTextLength;

/**
 * Cuánto se espera al worker que revisa diagramas: para arrancar, que carga
 * Mermaid entero, y para revisar uno. Pasado eso se da por caído: la escritura
 * no se hace y el worker se vuelve a levantar para la siguiente.
 */
export const MCP_DIAGRAM_CHECKER_START_TIMEOUT_MS = 30_000;
export const MCP_DIAGRAM_CHECK_TIMEOUT_MS = 10_000;

/**
 * Cuántos diagramas se revisan en una escritura. Cada uno pasa por Mermaid de
 * a uno; una llamada con cientos tendría esperando a todas las demás.
 */
export const MCP_DIAGRAMS_PER_WRITE = 20;

/**
 * Cuántos diagramas esperan a la vez al revisor, que es uno para todos. Cada
 * escritura pone uno por vez en la fila; si está llena, el que llega se va
 * enseguida a reintentar en vez de alargar la espera de todos.
 */
export const MCP_DIAGRAM_CHECKS_WAITING_MAX = 16;

/** Cuántos íconos devuelve una búsqueda, y hasta cuántos se le pueden pedir. */
export const MCP_ICON_SEARCH_DEFAULT = 20;
export const MCP_ICON_SEARCH_MAX = 100;

/** El largo de una fórmula: el mismo tope que acepta una página. */
export const MCP_FORMULA_MAX_LENGTH = maximumFormulaLatexLength;

/** Cuántos ítems lleva una lista escrita de una vez. */
export const MCP_LIST_ITEMS_PER_BLOCK = 200;

/** Cuántas filas y columnas lleva una tabla: los mismos topes que acepta una página. */
export const MCP_TABLE_ROWS_MAX = maximumTableRows;
export const MCP_TABLE_COLUMNS_MAX = maximumTableColumns;

/** El largo del título de un desplegable: el mismo tope que acepta una página. */
export const MCP_TOGGLE_SUMMARY_MAX_LENGTH = maximumToggleSummaryLength;

/** El largo de un id: de un bloque, una página, un espacio o un comentario. */
export const MCP_ID_MAX_LENGTH = 128;

/** El largo de la fecha de un comentario, que la página guarda como texto. */
export const MCP_COMMENT_DATE_MAX_LENGTH = 64;

/** El largo de un fragmento, un encabezado o una nota. */
export const MCP_TEXT_MAX_LENGTH = 10_000;

/** Cuánto de lo que el agente nombró se guarda al anotar un intento negado antes de escribir. */
export const MCP_ACTION_TARGET_MAX_LENGTH = 300;
