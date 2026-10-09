import type { PageOptionColor } from '@neuma/shared';

/** Soft backgrounds on purpose: saturated ones fight the surrounding text in a dense screen. */
export const PAGE_OPTION_COLOR_CLASSES: Readonly<Record<PageOptionColor, string>> = {
  GRAY: 'bg-neutral-500/15 text-neutral-800 dark:text-neutral-200',
  BROWN: 'bg-amber-800/15 text-amber-900 dark:text-amber-200',
  ORANGE: 'bg-orange-500/15 text-orange-900 dark:text-orange-200',
  YELLOW: 'bg-yellow-500/20 text-yellow-900 dark:text-yellow-200',
  GREEN: 'bg-green-600/15 text-green-900 dark:text-green-200',
  BLUE: 'bg-blue-600/15 text-blue-900 dark:text-blue-200',
  PURPLE: 'bg-purple-600/15 text-purple-900 dark:text-purple-200',
  PINK: 'bg-pink-600/15 text-pink-900 dark:text-pink-200',
  RED: 'bg-red-600/15 text-red-900 dark:text-red-200',
};

export const PAGE_OPTION_NO_COLOR_CLASS = 'bg-muted text-foreground';

/** Fainter than the label tint: it paints a whole column behind its cards, which must stay readable. */
export const PAGE_OPTION_SURFACE_CLASSES: Readonly<Record<PageOptionColor, string>> = {
  GRAY: 'bg-neutral-500/8',
  BROWN: 'bg-amber-800/8',
  ORANGE: 'bg-orange-500/8',
  YELLOW: 'bg-yellow-500/10',
  GREEN: 'bg-green-600/8',
  BLUE: 'bg-blue-600/8',
  PURPLE: 'bg-purple-600/8',
  PINK: 'bg-pink-600/8',
  RED: 'bg-red-600/8',
};

export const PAGE_OPTION_NO_SURFACE_CLASS = 'bg-muted/40';

/** Used where the column background already carries the color, so the name stays in normal ink. */
export const PAGE_OPTION_DOT_CLASSES: Readonly<Record<PageOptionColor, string>> = {
  GRAY: 'bg-neutral-500',
  BROWN: 'bg-amber-800',
  ORANGE: 'bg-orange-500',
  YELLOW: 'bg-yellow-500',
  GREEN: 'bg-green-600',
  BLUE: 'bg-blue-600',
  PURPLE: 'bg-purple-600',
  PINK: 'bg-pink-500',
  RED: 'bg-red-600',
};

export const PAGE_OPTION_NO_DOT_CLASS = 'bg-muted-foreground/50';

/** Chart shapes: full-strength fills, lightened in dark mode so they stay visible on a black background. */
export const PAGE_OPTION_FILL_CLASSES: Readonly<Record<PageOptionColor, string>> = {
  GRAY: 'fill-neutral-500 dark:fill-neutral-400',
  BROWN: 'fill-amber-800 dark:fill-amber-500',
  ORANGE: 'fill-orange-500 dark:fill-orange-400',
  YELLOW: 'fill-yellow-500 dark:fill-yellow-400',
  GREEN: 'fill-green-600 dark:fill-green-400',
  BLUE: 'fill-blue-600 dark:fill-blue-400',
  PURPLE: 'fill-purple-600 dark:fill-purple-400',
  PINK: 'fill-pink-500 dark:fill-pink-400',
  RED: 'fill-red-600 dark:fill-red-400',
};

export const PAGE_OPTION_NO_FILL_CLASS = 'fill-muted-foreground';
