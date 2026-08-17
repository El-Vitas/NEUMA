/** The index of a page: quiet, set apart from the writing, and never mistaken for it. */
export const PAGE_EDITOR_CONTENTS_STYLE_CLASS =
  'my-4 flex select-none flex-col gap-1 border-border border-s bg-surface-low px-4 py-3';

export const PAGE_EDITOR_CONTENTS_TITLE_STYLE_CLASS =
  'font-semibold text-muted-foreground text-xs uppercase tracking-wide';

/** A heading in the index: reads as a line of the page, answers like a button. */
export const PAGE_EDITOR_CONTENTS_ENTRY_STYLE_CLASS = [
  'cursor-pointer text-start text-muted-foreground text-sm transition-colors hover:text-foreground',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_CONTENTS_EMPTY_STYLE_CLASS = 'text-muted-foreground text-sm';

/** How far each level of heading is set in from the one above it. */
export const PAGE_EDITOR_CONTENTS_INDENT_REM = 0.75;

/** What tells the index it has to be drawn again: the headings of the page, said shortly. */
export const PAGE_EDITOR_CONTENTS_PLUGIN_KEY = 'page-editor-contents-plugin';

/**
 * How a heading of the page is recognised from outside the writing, so that the
 * index at the side can tell which one is being read without the page having to
 * give its headings addresses of their own.
 */
export const PAGE_EDITOR_HEADING_ATTRIBUTE = 'data-page-heading';

/** The index at the side lists a page from where it is read, not from within it. */
export const PAGE_OUTLINE_STYLE_CLASS = [
  'flex max-h-[calc(100vh-10rem)] flex-col gap-1 overflow-y-auto overscroll-contain',
  'border-border border-s ps-4 text-sm',
].join(' ');

/** A heading at the side: quiet until it is the one being read, or pointed at. */
export const PAGE_OUTLINE_ENTRY_STYLE_CLASS = [
  'cursor-pointer truncate text-start text-muted-foreground transition-colors hover:text-foreground',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_OUTLINE_READING_STYLE_CLASS = [
  'cursor-pointer truncate text-start font-medium text-foreground',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

/**
 * Where on the screen a page is read: below its own heading bar, so the heading
 * marked at the side is the one whoever is reading has already reached.
 */
export const PAGE_OUTLINE_READING_LINE = 140;

/**
 * A page is written in a column of its own, with its index at the edge. The
 * index appears only where there is room to spare: on a narrower screen the
 * page keeps the whole width, and the index of a page is then the block that
 * whoever wrote it decided to put in the writing.
 */
export const PAGE_OUTLINE_LAYOUT_STYLE_CLASS = 'gap-10 xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:items-start';

export const PAGE_OUTLINE_SIDE_STYLE_CLASS = 'hidden xl:sticky xl:top-12 xl:block';

/** Where the choice to hide the index is kept, the same way the sidebar keeps its own. */
export const PAGE_OUTLINE_VISIBILITY_STORAGE_KEY = 'company-brain-page-outline-hidden';

export const PAGE_OUTLINE_HEADER_STYLE_CLASS = 'flex items-center justify-between gap-2';

/** The button that hides or brings back the index: quiet, but a real touch target. */
export const PAGE_OUTLINE_TOGGLE_STYLE_CLASS = [
  'flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

/** What is left where the index was, so hiding it never leaves a bare gap in the page. */
export const PAGE_OUTLINE_COLLAPSED_STYLE_CLASS = 'flex justify-end';
