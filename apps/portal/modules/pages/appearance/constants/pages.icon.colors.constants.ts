import type { PageIconColor } from '../types/pages.icon.types';

export const PAGE_ICON_COLOR_SWATCH_STYLE_CLASSES: Readonly<Record<PageIconColor, string>> = {
  blue: 'bg-sky-500',
  brown: 'bg-amber-800',
  default: 'border border-border bg-foreground/70',
  gray: 'bg-zinc-500',
  green: 'bg-emerald-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  purple: 'bg-violet-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
};

/** `default` inherits the surrounding text colour instead of being a colour of its own. */
export const PAGE_ICON_COLOR_STYLE_CLASSES: Readonly<Record<PageIconColor, string>> = {
  blue: 'text-sky-500',
  brown: 'text-amber-800',
  default: 'text-current',
  gray: 'text-zinc-500',
  green: 'text-emerald-500',
  orange: 'text-orange-500',
  pink: 'text-pink-500',
  purple: 'text-violet-500',
  red: 'text-red-500',
  yellow: 'text-yellow-500',
};
