/**
 * Los nodos que no contienen nada.
 *
 * Darle a uno de estos un `content` vacío al escribirlo sería una forma que el
 * contrato guardado rechaza, y el rechazo llegaría en medio de una tecla.
 */
export const PAGE_DOCUMENT_LEAF_NODES: readonly string[] = [
  'audio',
  'bookmark',
  'code',
  'collection',
  'date',
  'divider',
  'em',
  'embed',
  'file',
  'formula',
  'hard_break',
  'image',
  'link',
  'mention',
  'person',
  'strong',
  'subpage',
  'synced',
  'table_of_contents',
  'text',
  'video',
];

/**
 * Atributos que solo dicen algo cuando son verdaderos.
 *
 * Se escriben cuando lo son y faltan cuando no, así una página llena de títulos
 * que nadie plegó, o de código que nadie ajustó al ancho, se lee igual que
 * antes de que existiera hacerlo.
 */
export const PAGE_DOCUMENT_ONLY_WHEN_TRUE_ATTRIBUTES: readonly string[] = ['collapsed', 'wrapped'];

/**
 * Atributos que solo dicen algo cuando pasan de uno.
 *
 * Una celda que abarca exactamente una columna y una fila es como todas, así
 * que escribirlo no diría nada y cambiaría cada tabla ya guardada.
 */
export const PAGE_DOCUMENT_ONLY_WHEN_BEYOND_ONE_ATTRIBUTES: readonly string[] = ['colspan', 'rowspan'];
