export const MARKDOWN_MARK_WRAPPERS = {
  code: '`',
  em: '*',
  strike: '~~',
  strong: '**',
} as const;

/** Directive syntax that Markdown tooling already reads, so a fence stays legible and findable on read-back. */
export const MARKDOWN_DIRECTIVE_FENCE = ':::';

/** Only what read-back needs to rebuild the block: a collection's source page id, not a column's incidental width. */
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

export const MARKDOWN_BLOCK_SEPARATOR = '\n\n';

/** Opens each page when several share one file, so read-back knows where each lived. */
export const MARKDOWN_PAGE_MARKER = '<!-- page:';

/** An HTML comment, so rendered Markdown looks unchanged while the block id stays available. */
export const MARKDOWN_BLOCK_ANCHOR_OPEN = '<!-- block:';
export const MARKDOWN_BLOCK_ANCHOR_CLOSE = ' -->';

/** An id with spaces or symbols could forge another block's anchor, so that block is written without one. */
export const MARKDOWN_BLOCK_ANCHOR_ID = /^[\w-]+$/;

export const MARKDOWN_PERSON_TARGET = 'person:';
export const MARKDOWN_DATE_TARGET = 'date:';

export const MARKDOWN_PERSON_PREFIX = '@';

/** Matches a Neuma page path, with or without a locale prefix. */
export const MARKDOWN_PAGE_PATH_PATTERN = /^(?:\/[a-z]{2}(?:-[A-Za-z]{2})?)?\/spaces\/([^/?#\s]+)\/pages\/([^/?#\s]+)/;

/** Every ASCII punctuation character, as in CommonMark: a backslash before any of them reads back literally. */
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

/** Characters a reader would take for formatting, including `<`, which could pass for a block anchor. */
export const MARKDOWN_TEXT_ESCAPED_PATTERN = /[\\*`[\]~$<]/g;

/** Line starts Markdown would read as another block (heading, quote, list, table, fence, rule). */
export const MARKDOWN_LINE_START_MARKER = /^(?:#|>|:::|\||[-+](?= |$)|---)/;

export const MARKDOWN_LINE_START_NUMBER = /^(\d+)\./;

export const MARKDOWN_LINK_TARGET_PATTERN = /[ ()<>]/g;
export const MARKDOWN_LINK_TARGET_ESCAPES: Readonly<Record<string, string>> = {
  ' ': '%20',
  '(': '%28',
  ')': '%29',
  '<': '%3C',
  '>': '%3E',
};

export const MARKDOWN_DIRECTIVE_VALUE_PATTERN = /[\n"&]/g;
export const MARKDOWN_DIRECTIVE_VALUE_ESCAPES: Readonly<Record<string, string>> = {
  '\n': '&#10;',
  '"': '&quot;',
  '&': '&amp;',
};

export const MARKDOWN_CODE_FENCE_LEAST = 3;

export const MARKDOWN_FORMULA_DELIMITER = '$';

/** A digit right after the closing `$` means it was a price, not a formula. */
export const MARKDOWN_AMOUNT_AFTER_DOLLAR = /\d/;

/** Marks Markdown cannot express, written as HTML tags; color marks carry the color in `color`. */
export const MARKDOWN_TAG_MARKS = {
  background_color: 'mark',
  text_color: 'span',
  underline: 'u',
} as const;

export const MARKDOWN_TAG_OPENING = /^<(u|span|mark)(?: color="([^"]*)")?>/;

/** Only this many characters are inspected for an opening tag, not the rest of the text. */
export const MARKDOWN_TAG_OPENING_MAX_LENGTH = 64;

/** Deeper nesting is treated as text built to stall the parser. */
export const MARKDOWN_MAX_NESTING = 32;

export const MARKDOWN_BLOCK_COLOR_ATTRIBUTES = ['textColor', 'backgroundColor'] as const;

/** Ordered longest delimiter first. */
export const MARKDOWN_PAIRED_MARKS = [
  { delimiter: '**', mark: 'strong' },
  { delimiter: '~~', mark: 'strike' },
  { delimiter: '*', mark: 'em' },
] as const;
