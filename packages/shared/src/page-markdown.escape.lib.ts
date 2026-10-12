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

export const escapeMarkdownText = (text: string): string =>
  text.replace(MARKDOWN_TEXT_ESCAPED_PATTERN, String.raw`\$&`);

const escapeLineStart = (line: string): string => {
  if (MARKDOWN_LINE_START_NUMBER.test(line)) return line.replace(MARKDOWN_LINE_START_NUMBER, String.raw`$1\.`);
  return MARKDOWN_LINE_START_MARKER.test(line) ? `\\${line}` : line;
};

export const escapeMarkdownLineStarts = (written: string): string =>
  written.split('\n').map(escapeLineStart).join('\n');

export const escapeMarkdownLinkTarget = (target: string): string =>
  replaceEach(target, MARKDOWN_LINK_TARGET_PATTERN, MARKDOWN_LINK_TARGET_ESCAPES);

export const escapeMarkdownDirectiveValue = (value: string): string =>
  replaceEach(value, MARKDOWN_DIRECTIVE_VALUE_PATTERN, MARKDOWN_DIRECTIVE_VALUE_ESCAPES);

/** One backtick longer than the longest run in the code, so the code cannot close the fence. */
export const buildMarkdownCodeFence = (code: string): string => {
  const longestRun = (code.match(/`+/g) ?? []).reduce((longest, run) => Math.max(longest, run.length), 0);
  return '`'.repeat(Math.max(MARKDOWN_CODE_FENCE_LEAST, longestRun + 1));
};

export const escapeMarkdownTableCell = (written: string): string =>
  written.replaceAll('|', String.raw`\|`).replaceAll(/\n+/g, ' ');
