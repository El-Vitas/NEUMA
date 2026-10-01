/** What Markdown puts around a word to mark it, by the name the page calls that mark. */
export const MARKDOWN_MARK_WRAPPERS = {
  code: '`',
  em: '*',
  strike: '~~',
  strong: '**',
} as const;

/**
 * What opens and closes a block Markdown has no word for.
 *
 * Three colons rather than something invented: it is the directive syntax
 * Markdown tooling already reads, so a fence stays legible to a person and
 * findable by whatever reads the file back.
 */
export const MARKDOWN_DIRECTIVE_FENCE = ':::';

/** A blank line between blocks, which is what tells Markdown one block ended and another began. */
export const MARKDOWN_BLOCK_SEPARATOR = '\n\n';

/** What opens each page when several are written into one file, so a reader-back knows where it lived. */
export const MARKDOWN_PAGE_MARKER = '<!-- page:';

/**
 * Lo que va antes de un bloque para decir cuál es, y lo que lo cierra.
 *
 * Un comentario de HTML porque Markdown no lo muestra: quien lo lee ve el
 * documento de siempre, y quien necesita nombrar un bloque tiene su id a mano.
 */
export const MARKDOWN_BLOCK_ANCHOR_OPEN = '<!-- block:';
export const MARKDOWN_BLOCK_ANCHOR_CLOSE = ' -->';

/** Cómo se escribe, dentro de un enlace, una persona y una fecha: igual que como la página las escribe al leerse. */
export const MARKDOWN_PERSON_TARGET = 'person:';
export const MARKDOWN_DATE_TARGET = 'date:';

/** Lo que antecede al nombre de una persona en el texto de su enlace. */
export const MARKDOWN_PERSON_PREFIX = '@';

/** Dónde dice un enlace a qué página de Company Brain lleva, con o sin dominio e idioma delante. */
export const MARKDOWN_PAGE_PATH_PATTERN =
  /^(?:[a-z]+:\/\/[^/]+)?(?:\/[a-z]{2}(?:-[A-Za-z]{2})?)?\/spaces\/([^/?#\s]+)\/pages\/([^/?#\s]+)/;

/** Los caracteres que se escriben con una barra delante para que se lean tal cual. */
export const MARKDOWN_ESCAPABLE_CHARACTERS: readonly string[] = ['\\', '*', '_', '`', '[', ']', '(', ')', '~', '$'];

/** Lo que encierra una fórmula dentro de una línea, igual que la página la escribe al leerse. */
export const MARKDOWN_FORMULA_DELIMITER = '$';

/** Lo que, justo después del signo que cierra una fórmula, dice que era un precio y no una fórmula. */
export const MARKDOWN_AMOUNT_AFTER_DOLLAR = /\d/;

/**
 * Las marcas que Markdown no tiene cómo decir y que se escriben con una etiqueta
 * de HTML: la que cualquier lector de Markdown conoce para eso mismo. Las de
 * color dicen cuál en su atributo `color`.
 */
export const MARKDOWN_TAG_MARKS = {
  background_color: 'mark',
  text_color: 'span',
  underline: 'u',
} as const;

/** Cómo abre una de esas etiquetas: su nombre y, si pinta, el color. */
export const MARKDOWN_TAG_OPENING = /^<(u|span|mark)(?: color="([^"]*)")?>/;

/** Los colores de un bloque entero, escritos en su ancla con el nombre que tienen en la página. */
export const MARKDOWN_BLOCK_COLOR_ATTRIBUTES = ['textColor', 'backgroundColor'] as const;

/** Las marcas que se abren y se cierran con el mismo signo, del signo más largo al más corto. */
export const MARKDOWN_PAIRED_MARKS = [
  { delimiter: '**', mark: 'strong' },
  { delimiter: '~~', mark: 'strike' },
  { delimiter: '*', mark: 'em' },
] as const;
