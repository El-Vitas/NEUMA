import { DIAGRAM_MENDED_STYLE_CLASS } from '@/shared/constants/diagram.constants';

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

export const PAGE_EDITOR_DIAGRAM_ZOOM_LEVEL_STYLE_CLASS = 'min-w-12 px-1 text-xs tabular-nums';

/** The edge a frame is made taller or lower by, drawn as a line that shows it can be taken hold of. */
export const PAGE_EDITOR_DIAGRAM_FRAME_HANDLE_STYLE_CLASS = [
  'flex h-3 w-full shrink-0 cursor-row-resize touch-none items-center justify-center',
  'border-border border-t bg-surface-low hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
  'after:h-0.5 after:w-10 after:rounded-full after:bg-muted-foreground/40',
].join(' ');

/** How much taller or lower one press of an arrow makes a frame. */
export const PAGE_EDITOR_DIAGRAM_FRAME_KEY_STEPS: Readonly<Partial<Record<string, number>>> = {
  ArrowDown: 40,
  ArrowUp: -40,
};

/** What went wrong is said in the page's own words, without taking the page down with it. */
export const PAGE_EDITOR_DIAGRAM_FAULT_STYLE_CLASS =
  'border-border border-t bg-surface-low px-3 py-2 text-destructive text-xs';

/** Taken to the whole screen, the drawing is what fills it — the bar and the writing keep their size. */
export const PAGE_EDITOR_DIAGRAM_WIDE_STYLE_CLASS = [
  '[&:fullscreen]:bg-surface',
  '[&:fullscreen_[data-page-diagram]]:grow',
  /** The whole screen is the frame then, whatever height the frame on the page was given. */
  '[&:fullscreen_[data-page-diagram]]:h-auto! [&:fullscreen_[data-page-diagram]]:max-h-none!',
  '[&:fullscreen_[data-diagram-frame-handle]]:hidden',
].join(' ');

/** A formula is set out in the middle of its box, like the line of a book it stands in for. */
export const PAGE_EDITOR_FORMULA_STYLE_CLASS = 'flex w-full justify-center overflow-auto p-4 text-foreground';
