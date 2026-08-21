/** What Markdown puts around a word to mark it, by the name the page calls that mark. */
export const MARKDOWN_MARK_WRAPPERS = {
  bold: '**',
  code: '`',
  italic: '*',
  strike: '~~',
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
