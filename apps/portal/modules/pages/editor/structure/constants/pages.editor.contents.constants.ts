export const PAGE_EDITOR_CONTENTS_STYLE_CLASS =
  'my-4 flex select-none flex-col gap-1 border-border border-s bg-surface-low px-4 py-3';

export const PAGE_EDITOR_CONTENTS_TITLE_STYLE_CLASS =
  'font-semibold text-muted-foreground text-xs uppercase tracking-wide';

export const PAGE_EDITOR_CONTENTS_ENTRY_STYLE_CLASS = [
  'cursor-pointer text-start text-muted-foreground text-sm transition-colors hover:text-foreground',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_CONTENTS_EMPTY_STYLE_CLASS = 'text-muted-foreground text-sm';

export const PAGE_EDITOR_CONTENTS_INDENT_REM = 0.75;

export const PAGE_EDITOR_CONTENTS_PLUGIN_KEY = 'page-editor-contents-plugin';

/** Lets the side outline find the headings in the DOM without giving each one an id. */
export const PAGE_EDITOR_HEADING_ATTRIBUTE = 'data-page-heading';

export const PAGE_OUTLINE_STYLE_CLASS = 'relative flex justify-end text-sm';

export const PAGE_OUTLINE_ENTRY_BUTTON_STYLE_CLASS = [
  'flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1.5',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_OUTLINE_ENTRY_BUTTON_COLLAPSED_STYLE_CLASS = 'w-auto justify-end';

/** No explicit full width: it would ignore the entry's indent and spill past the panel edge. */
export const PAGE_OUTLINE_ENTRY_BUTTON_EXPANDED_STYLE_CLASS = 'justify-start';

export const PAGE_OUTLINE_ENTRY_STYLE_CLASS = 'text-muted-foreground';

export const PAGE_OUTLINE_READING_STYLE_CLASS = 'font-medium text-foreground';

/** The name stays in the DOM while the rail is closed (shrunk and transparent) so screen readers still reach it. */
export const PAGE_OUTLINE_ENTRY_TEXT_STYLE_CLASS = 'overflow-hidden whitespace-nowrap';

/** Applied only when expanding; collapsing hides the name at once to avoid a word caught mid-fade. */
export const PAGE_OUTLINE_ENTRY_TEXT_TRANSITION_STYLE_CLASS =
  'transition-[opacity,max-width] duration-150 motion-reduce:transition-none';

export const PAGE_OUTLINE_ENTRY_TEXT_COLLAPSED_STYLE_CLASS = 'max-w-0 opacity-0';

export const PAGE_OUTLINE_ENTRY_TEXT_EXPANDED_STYLE_CLASS = 'max-w-[10rem] truncate opacity-100';

export const PAGE_OUTLINE_RAIL_MARK_STYLE_CLASS = [
  'h-0.5 shrink-0 rounded-full bg-muted-foreground',
  'transition-[width,height,background-color] duration-150 motion-reduce:transition-none',
].join(' ');

export const PAGE_OUTLINE_RAIL_MARK_READING_STYLE_CLASS = 'h-1 bg-foreground';

export const PAGE_OUTLINE_RAIL_MARK_WIDTH_STYLE_CLASS_BY_LEVEL: Readonly<Record<number, string>> = {
  1: 'w-4',
  2: 'w-3',
  3: 'w-2',
};

export const PAGE_OUTLINE_RAIL_MARK_FALLBACK_WIDTH_STYLE_CLASS = 'w-2';

export const PAGE_OUTLINE_LIST_SCROLL_STYLE_CLASS = 'max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain';

export const PAGE_OUTLINE_RAIL_STYLE_CLASS = 'flex w-full flex-col items-end gap-1.5 py-1';

/** Floats over the writing; z-50 sits above the editor's own floating layers (highest is z-40). */
export const PAGE_OUTLINE_PANEL_STYLE_CLASS = [
  'absolute top-0 right-0 z-50 flex w-56 flex-col gap-1 rounded-md border border-border bg-surface-low p-3 shadow-lg',
  'transition-[opacity,transform] duration-150 motion-reduce:transition-none',
].join(' ');

/** Viewport offset in pixels, just below the page's own heading bar. */
export const PAGE_OUTLINE_READING_LINE = 140;

/** The side index only appears from `xl`; below that the page keeps the full width. */
export const PAGE_OUTLINE_LAYOUT_STYLE_CLASS = 'gap-10 xl:grid xl:grid-cols-[minmax(0,1fr)_2rem] xl:items-start';

/** `top-14` matches the topbar height (`h-14`) so the open panel never covers the search bar. */
export const PAGE_OUTLINE_SIDE_STYLE_CLASS = 'hidden xl:sticky xl:top-14 xl:block';
