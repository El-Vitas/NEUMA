import type { PageIconColor } from '../types/pages.icon.types';

/**
 * What each colour looks like once a symbol wears it.
 *
 * «Default» is not a colour of its own: it lets the symbol take whatever colour
 * the writing around it already has, which is what most pages want and what a
 * page reverts to when its colour is taken away.
 */
/** The same colours as a filled dot, for choosing one rather than wearing it. */
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
