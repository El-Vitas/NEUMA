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
export const PAGE_OUTLINE_STYLE_CLASS = 'relative flex justify-end text-sm';

/** What every heading control shares, whether it is drawn as a mark or a named line. */
export const PAGE_OUTLINE_ENTRY_BUTTON_STYLE_CLASS = [
  'flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1.5',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

/** Collapsed, a heading control hugs the rail's edge and is only as wide as its mark. */
export const PAGE_OUTLINE_ENTRY_BUTTON_COLLAPSED_STYLE_CLASS = 'w-auto justify-end';

/**
 * Open, a heading control fills what the panel's stretch already gives it, so
 * its whole row answers to a click without an indented control spilling past
 * the panel's own edge — an explicit full width would ignore its own indent.
 */
export const PAGE_OUTLINE_ENTRY_BUTTON_EXPANDED_STYLE_CLASS = 'justify-start';

/** A heading's name: quiet until it is the one being read. */
export const PAGE_OUTLINE_ENTRY_STYLE_CLASS = 'text-muted-foreground';

export const PAGE_OUTLINE_READING_STYLE_CLASS = 'font-medium text-foreground';

/**
 * A heading's name stays in the writing even while the rail is closed, so a
 * screen reader meets it without ever needing the rail to open. What closing
 * hides is only how the name is drawn: shrunk to nothing and see-through.
 */
export const PAGE_OUTLINE_ENTRY_TEXT_STYLE_CLASS = 'overflow-hidden whitespace-nowrap';

/**
 * Only the way in is animated.
 *
 * On the way out the name has to be gone at once: a word caught mid-fade where
 * a line belongs reads as a glitch, not as a flourish.
 */
export const PAGE_OUTLINE_ENTRY_TEXT_TRANSITION_STYLE_CLASS =
  'transition-[opacity,max-width] duration-150 motion-reduce:transition-none';

export const PAGE_OUTLINE_ENTRY_TEXT_COLLAPSED_STYLE_CLASS = 'max-w-0 opacity-0';

export const PAGE_OUTLINE_ENTRY_TEXT_EXPANDED_STYLE_CLASS = 'max-w-[10rem] truncate opacity-100';

/** The mark drawn for a heading: a line whose own length says how deep it sits. */
export const PAGE_OUTLINE_RAIL_MARK_STYLE_CLASS = [
  'h-0.5 shrink-0 rounded-full bg-muted-foreground',
  'transition-[width,height,background-color] duration-150 motion-reduce:transition-none',
].join(' ');

/** How a mark is set apart once it is the heading being read: taller, not only a different shade. */
export const PAGE_OUTLINE_RAIL_MARK_READING_STYLE_CLASS = 'h-1 bg-foreground';

/** Only levels one to three are ever written, so only three lengths of mark are needed. */
export const PAGE_OUTLINE_RAIL_MARK_WIDTH_STYLE_CLASS_BY_LEVEL: Readonly<Record<number, string>> = {
  1: 'w-4',
  2: 'w-3',
  3: 'w-2',
};

export const PAGE_OUTLINE_RAIL_MARK_FALLBACK_WIDTH_STYLE_CLASS = 'w-2';

/** The scroll boundary a long index needs, whether it is drawn as a rail or a panel. */
export const PAGE_OUTLINE_LIST_SCROLL_STYLE_CLASS = 'max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain';

/** At rest, the index is nothing but the marks themselves, held against the rail's edge. */
export const PAGE_OUTLINE_RAIL_STYLE_CLASS = 'flex w-full flex-col items-end gap-1.5 py-1';

/**
 * Opened, the index floats over the writing instead of pushing it aside, so the
 * room it takes at rest never has to be wider than the marks themselves. It is
 * raised above the editor's own floating layers (the highest of which sits at
 * z-40), so nothing the writing throws up can cover it while it is open.
 */
export const PAGE_OUTLINE_PANEL_STYLE_CLASS = [
  'absolute top-0 right-0 z-50 flex w-56 flex-col gap-1 rounded-md border border-border bg-surface-low p-3 shadow-lg',
  'transition-[opacity,transform] duration-150 motion-reduce:transition-none',
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
 * whoever wrote it decided to put in the writing. At rest the edge it is given
 * is only as wide as a mark needs to be; opened, the index floats past it.
 */
export const PAGE_OUTLINE_LAYOUT_STYLE_CLASS = 'gap-10 xl:grid xl:grid-cols-[minmax(0,1fr)_2rem] xl:items-start';

/**
 * Stuck exactly at the search bar's own height (`h-14`, `topbar.tsx`), so the
 * panel that opens from here — raised above the writing's floating layers —
 * never has room to reach into the search bar's row and cover it.
 */
export const PAGE_OUTLINE_SIDE_STYLE_CLASS = 'hidden xl:sticky xl:top-14 xl:block';
