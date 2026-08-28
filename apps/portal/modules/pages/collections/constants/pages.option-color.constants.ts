import type { PageOptionColor } from '@company-brain/shared';

/**
 * How each color of an option is painted.
 *
 * Kept soft on purpose: an option is a label inside a dense screen, and a
 * saturated background there fights with the writing around it. The text keeps
 * its own weight so a colorblind reader tells one option from another by what it
 * says, never by its color alone.
 */
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

/** What an option without a color of its own wears, so every option still reads as a label. */
export const PAGE_OPTION_NO_COLOR_CLASS = 'bg-muted text-foreground';
