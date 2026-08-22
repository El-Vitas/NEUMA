/**
 * How much pasted text this page still tries to read as Markdown.
 *
 * Beyond this many characters the page stops trying to turn what was pasted
 * into blocks — reading it that way is line-by-line work, and a page that
 * keeps reading regardless of how much was dropped on it is a page that can
 * be frozen by pasting enough of anything.
 */
export const PAGE_EDITOR_MAX_CONVERTIBLE_PASTE_LENGTH = 200_000;

/** The mark ProseMirror leaves on what it copies from an editor, so a paste from one is recognised as one. */
export const PAGE_EDITOR_OWN_SLICE_ATTRIBUTE = 'data-pm-slice';

/** The letter half of the shortcut that asks for writing without what it carries. */
export const PAGE_EDITOR_PLAIN_TEXT_PASTE_KEY = 'v';
