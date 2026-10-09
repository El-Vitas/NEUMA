import { DIAGRAM_MENDED_STYLE_CLASS } from '@/shared/constants/diagram.constants';

export const PAGE_EDITOR_DIAGRAM_STALE_STYLE_CLASS = 'opacity-40';

/** Debounce, so a diagram is not redrawn per keystroke. */
export const PAGE_EDITOR_DIAGRAM_SETTLE_MS = 400;

export const PAGE_EDITOR_DIAGRAM_STYLE_CLASS = 'flex w-full flex-col border border-border bg-surface-low';

/** `safe center` centres only while the drawing fits; plain centring would push the start out of scroll reach. */
export const PAGE_EDITOR_DIAGRAM_DRAWING_STYLE_CLASS = [
  'flex w-full [justify-content:safe_center] overflow-auto p-4',
  '[&_svg]:h-auto [&_svg]:shrink-0',
  // Print has no scrolling, so a wide drawing is fitted to the sheet instead of cut.
  'print:overflow-visible print:[&_svg]:max-w-full!',
  DIAGRAM_MENDED_STYLE_CLASS,
].join(' ');

export const PAGE_EDITOR_DIAGRAM_ZOOM_LEVEL_STYLE_CLASS = 'min-w-12 px-1 text-xs tabular-nums';

export const PAGE_EDITOR_DIAGRAM_FRAME_HANDLE_STYLE_CLASS = [
  'flex h-3 w-full shrink-0 cursor-row-resize touch-none items-center justify-center',
  'border-border border-t bg-surface-low hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
  'after:h-0.5 after:w-10 after:rounded-full after:bg-muted-foreground/40',
].join(' ');

export const PAGE_EDITOR_DIAGRAM_FRAME_KEY_STEPS: Readonly<Partial<Record<string, number>>> = {
  ArrowDown: 40,
  ArrowUp: -40,
};

/** Restores automatic height, like a double click; Enter is the splitter restore key. */
export const PAGE_EDITOR_DIAGRAM_FRAME_RESET_KEY = 'Enter';

export const PAGE_EDITOR_DIAGRAM_FAULT_STYLE_CLASS =
  'border-border border-t bg-surface-low px-3 py-2 text-destructive text-xs';

/** In fullscreen only the drawing grows; the toolbar keeps its size. */
export const PAGE_EDITOR_DIAGRAM_WIDE_STYLE_CLASS = [
  '[&:fullscreen]:bg-surface',
  '[&:fullscreen_[data-page-diagram]]:grow',
  // Overrides the frame height set on the page.
  '[&:fullscreen_[data-page-diagram]]:h-auto! [&:fullscreen_[data-page-diagram]]:max-h-none!',
  '[&:fullscreen_[data-diagram-frame-handle]]:hidden',
].join(' ');

/** Delay before revoking the download URL: some browsers start the save after the click, so an early revoke fails. */
export const PAGE_EDITOR_DRAWING_DOWNLOAD_KEPT_MS = 40_000;

export const PAGE_EDITOR_FORMULA_STYLE_CLASS = 'flex w-full justify-center overflow-auto p-4 text-foreground';
