export const PAGES_READING_POSITION_STORAGE_KEY_PREFIX = 'pages-reading-position:';
export const PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT = 6;
export const PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS = 120;
export const PAGES_READING_POSITION_SAVE_DEBOUNCE_MS = 200;

export const PAGES_READING_POSITION_SCROLLABLE_OVERFLOWS: readonly string[] = ['auto', 'scroll', 'overlay'];

/** User-initiated scroll gestures; programmatic `window.scrollTo` fires none of them. */
export const PAGES_READING_POSITION_POINTER_INTERRUPT_EVENTS = ['wheel', 'touchstart'] as const;

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
