/** Longer pastes skip Markdown conversion, which works line by line and could freeze the page. */
export const PAGE_EDITOR_MAX_CONVERTIBLE_PASTE_LENGTH = 200_000;

/** Attribute ProseMirror adds to its own copied HTML, which identifies a paste from an editor. */
export const PAGE_EDITOR_OWN_SLICE_ATTRIBUTE = 'data-pm-slice';

export const PAGE_EDITOR_PLAIN_TEXT_PASTE_KEY = 'v';
