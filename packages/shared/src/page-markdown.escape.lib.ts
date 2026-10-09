import {
  MARKDOWN_CODE_FENCE_LEAST,
  MARKDOWN_DIRECTIVE_VALUE_ESCAPES,
  MARKDOWN_DIRECTIVE_VALUE_PATTERN,
  MARKDOWN_LINE_START_MARKER,
  MARKDOWN_LINE_START_NUMBER,
  MARKDOWN_LINK_TARGET_ESCAPES,
  MARKDOWN_LINK_TARGET_PATTERN,
  MARKDOWN_TEXT_ESCAPED_PATTERN,
} from './constants/page-markdown.constants.js';

const replaceEach = (text: string, pattern: RegExp, escapes: Readonly<Record<string, string>>): string =>
  text.replace(pattern, (character) => escapes[character] ?? character);

/** Unas palabras escritas para que se lean tal cual: cada signo que el lector tomaría por formato va con su barra. */
export const escapeMarkdownText = (text: string): string =>
  text.replace(MARKDOWN_TEXT_ESCAPED_PATTERN, String.raw`\$&`);

/** Una línea de palabras que no empieza como otro bloque: si lo haría, el signo que lo abre lleva su barra. */
const escapeLineStart = (line: string): string => {
  if (MARKDOWN_LINE_START_NUMBER.test(line)) return line.replace(MARKDOWN_LINE_START_NUMBER, String.raw`$1\.`);
  return MARKDOWN_LINE_START_MARKER.test(line) ? `\\${line}` : line;
};

/** Un párrafo ya escrito, con cada una de sus líneas a salvo de leerse como otro bloque. */
export const escapeMarkdownLineStarts = (written: string): string =>
  written.split('\n').map(escapeLineStart).join('\n');

/** El destino de un enlace, sin lo que cerraría sus paréntesis antes de tiempo. */
export const escapeMarkdownLinkTarget = (target: string): string =>
  replaceEach(target, MARKDOWN_LINK_TARGET_PATTERN, MARKDOWN_LINK_TARGET_ESCAPES);

/** El valor de un atributo de una cerca, sin lo que cerraría sus comillas o su línea antes de tiempo. */
export const escapeMarkdownDirectiveValue = (value: string): string =>
  replaceEach(value, MARKDOWN_DIRECTIVE_VALUE_PATTERN, MARKDOWN_DIRECTIVE_VALUE_ESCAPES);

/** Lo que abre y cierra un bloque de código: más acentos graves que los que el código lleva seguidos. */
export const buildMarkdownCodeFence = (code: string): string => {
  const longestRun = (code.match(/`+/g) ?? []).reduce((longest, run) => Math.max(longest, run.length), 0);
  return '`'.repeat(Math.max(MARKDOWN_CODE_FENCE_LEAST, longestRun + 1));
};

/** Lo que dice una celda de una tabla, en una sola línea y sin lo que la partiría en dos celdas. */
export const escapeMarkdownTableCell = (written: string): string =>
  written.replaceAll('|', String.raw`\|`).replaceAll(/\n+/g, ' ');
