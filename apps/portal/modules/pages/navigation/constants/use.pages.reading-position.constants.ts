export const PAGES_READING_POSITION_STORAGE_KEY_PREFIX = 'pages-reading-position:';
export const PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT = 6;
export const PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS = 120;
export const PAGES_READING_POSITION_SAVE_DEBOUNCE_MS = 200;

/** What tells the reading area apart from every other box the page sits in. */
export const PAGES_READING_POSITION_SCROLLABLE_OVERFLOWS: readonly string[] = ['auto', 'scroll', 'overlay'];

/** Pointer gestures that only the reader can make, never `window.scrollTo` itself. */
export const PAGES_READING_POSITION_POINTER_INTERRUPT_EVENTS = ['wheel', 'touchstart'] as const;

/** The keys that actually move a page, as opposed to typing in it. */
export const PAGES_READING_POSITION_SCROLL_KEYS: readonly string[] = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
];
