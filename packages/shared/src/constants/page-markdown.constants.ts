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

/**
 * The attributes each kind of block is written with.
 *
 * Only what a reader-back would need to rebuild the block: an id that says
 * which page a collection draws from is worth keeping, and the width a column
 * happened to have is not.
 */
export const MARKDOWN_DIRECTIVE_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
  bookmark: ['url', 'title', 'description'],
  button: ['label'],
  callout: ['icon'],
  collection: ['pageId', 'viewName'],
  column: ['width'],
  column_list: [],
  embed: ['url'],
  file: ['assetId', 'name'],
  subpage: ['pageId', 'label'],
  synced: ['pageId', 'blockId'],
  toggle: ['summary'],
};

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

/**
 * Un id que se puede escribir en el ancla: letras, dígitos, guiones y guiones
 * bajos, como los que da el editor. Uno con espacios o signos podría cerrar el
 * comentario y abrir el ancla de otro bloque, así que ese bloque va sin ancla.
 */
export const MARKDOWN_BLOCK_ANCHOR_ID = /^[\w-]+$/;

/** Cómo se escribe, dentro de un enlace, una persona y una fecha: igual que como la página las escribe al leerse. */
export const MARKDOWN_PERSON_TARGET = 'person:';
export const MARKDOWN_DATE_TARGET = 'date:';

/** Lo que antecede al nombre de una persona en el texto de su enlace. */
export const MARKDOWN_PERSON_PREFIX = '@';

/** Dónde dice el camino de un enlace a qué página de Company Brain lleva, con o sin idioma delante. */
export const MARKDOWN_PAGE_PATH_PATTERN = /^(?:\/[a-z]{2}(?:-[A-Za-z]{2})?)?\/spaces\/([^/?#\s]+)\/pages\/([^/?#\s]+)/;

/**
 * Los caracteres que, con una barra delante, se leen tal cual: todos los signos
 * de ASCII, como en CommonMark. Así lo que la página escribe con su barra se lee
 * de vuelta sin perder nada.
 */
export const MARKDOWN_ESCAPABLE_CHARACTERS: readonly string[] = [
  '!',
  '"',
  '#',
  '$',
  '%',
  '&',
  "'",
  '(',
  ')',
  '*',
  '+',
  ',',
  '-',
  '.',
  '/',
  ':',
  ';',
  '<',
  '=',
  '>',
  '?',
  '@',
  '[',
  '\\',
  ']',
  '^',
  '_',
  '`',
  '{',
  '|',
  '}',
  '~',
];

/**
 * Los signos que, dentro de unas palabras, el lector tomaría por formato, y
 * que la página escribe con su barra: una marca, un enlace, una fórmula, o un
 * comentario de HTML que se haría pasar por el ancla de un bloque.
 */
export const MARKDOWN_TEXT_ESCAPED_PATTERN = /[\\*`[\]~$<]/g;

/**
 * Cómo empieza una línea que Markdown leería como otro bloque: un título, una
 * cita, una lista, una tabla, una cerca o una raya. Unas palabras que empiezan
 * así se escriben con la barra delante del signo.
 */
export const MARKDOWN_LINE_START_MARKER = /^(?:#|>|:::|\||[-+](?= |$)|---)/;

/** Un número seguido de punto al empezar una línea, que Markdown leería como lista numerada. */
export const MARKDOWN_LINE_START_NUMBER = /^(\d+)\./;

/** Lo que un enlace no puede llevar tal cual entre sus paréntesis, con cómo se escribe. */
export const MARKDOWN_LINK_TARGET_PATTERN = /[ ()<>]/g;
export const MARKDOWN_LINK_TARGET_ESCAPES: Readonly<Record<string, string>> = {
  ' ': '%20',
  '(': '%28',
  ')': '%29',
  '<': '%3C',
  '>': '%3E',
};

/** Lo que el valor de un atributo de una cerca no puede llevar tal cual entre sus comillas, con cómo se escribe. */
export const MARKDOWN_DIRECTIVE_VALUE_PATTERN = /[\n"&]/g;
export const MARKDOWN_DIRECTIVE_VALUE_ESCAPES: Readonly<Record<string, string>> = {
  '\n': '&#10;',
  '"': '&quot;',
  '&': '&amp;',
};

/** Cuántos acentos graves abren, como mínimo, un bloque de código. */
export const MARKDOWN_CODE_FENCE_LEAST = 3;

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

/** Lo más que puede medir una etiqueta que abre: se mira solo eso, no el resto del texto. */
export const MARKDOWN_TAG_OPENING_MAX_LENGTH = 64;

/** Cuántos enlaces y marcas pueden ir uno dentro de otro; más que eso es un texto hecho para trabar la lectura. */
export const MARKDOWN_MAX_NESTING = 32;

/** Los colores de un bloque entero, escritos en su ancla con el nombre que tienen en la página. */
export const MARKDOWN_BLOCK_COLOR_ATTRIBUTES = ['textColor', 'backgroundColor'] as const;

/** Las marcas que se abren y se cierran con el mismo signo, del signo más largo al más corto. */
export const MARKDOWN_PAIRED_MARKS = [
  { delimiter: '**', mark: 'strong' },
  { delimiter: '~~', mark: 'strike' },
  { delimiter: '*', mark: 'em' },
] as const;
