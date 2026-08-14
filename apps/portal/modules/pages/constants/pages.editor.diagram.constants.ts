import { DIAGRAM_MENDED_STYLE_CLASS } from '@/shared/constants/diagram.constants';

/** The language a diagram is written in, which is what tells a code block to draw. */
export const PAGE_EDITOR_DIAGRAM_LANGUAGE = 'mermaid';

/** What separates the four numbers of the box a drawing was drawn inside. */
export const PAGE_EDITOR_DIAGRAM_BOX_GAP = /\s+/;

/** A drawing that no longer matches the writing beside it, kept while it is being fixed. */
export const PAGE_EDITOR_DIAGRAM_STALE_STYLE_CLASS = 'opacity-40';

/** How long the writing is left alone before it is drawn again, so a diagram is not redrawn per keystroke. */
export const PAGE_EDITOR_DIAGRAM_SETTLE_MS = 400;

export const PAGE_EDITOR_DIAGRAM_STYLE_CLASS = 'flex w-full flex-col border border-border bg-surface-low';

/**
 * The drawing is given room and may be wider than the page; it scrolls inside
 * its own box, and is centred only while it fits — centring what overflows puts
 * the start of it out of reach of the scroll.
 */
export const PAGE_EDITOR_DIAGRAM_DRAWING_STYLE_CLASS = [
  'flex w-full [justify-content:safe_center] overflow-auto p-4',
  '[&_svg]:h-auto [&_svg]:shrink-0',
  /** On paper there is nothing to scroll, so a drawing too wide for the sheet is fitted to it instead of being cut. */
  'print:overflow-visible print:[&_svg]:max-w-full!',
  DIAGRAM_MENDED_STYLE_CLASS,
].join(' ');

/** What a drawing that reaches past its box says it can be: taken hold of and moved. */
export const PAGE_EDITOR_DIAGRAM_MOVABLE_STYLE_CLASS = 'cursor-grab';

/** How much closer one turn of the wheel brings a drawing. */
export const PAGE_EDITOR_DIAGRAM_ZOOM_STEP = 1.1;

/** How far a drawing can be pushed away and how close it can be brought. */
export const PAGE_EDITOR_DIAGRAM_ZOOM_LEAST = 0.25;
export const PAGE_EDITOR_DIAGRAM_ZOOM_MOST = 4;

/** What went wrong is said in the page's own words, without taking the page down with it. */
export const PAGE_EDITOR_DIAGRAM_FAULT_STYLE_CLASS =
  'border-border border-t bg-surface-low px-3 py-2 text-destructive text-xs';

/** Taken to the whole screen, the drawing is what fills it — the bar and the writing keep their size. */
export const PAGE_EDITOR_DIAGRAM_WIDE_STYLE_CLASS = [
  '[&:fullscreen]:bg-surface',
  '[&:fullscreen_[data-page-diagram]]:grow',
].join(' ');
