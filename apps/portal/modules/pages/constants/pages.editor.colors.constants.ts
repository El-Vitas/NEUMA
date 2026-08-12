import type { PageEditorBlockColorKind } from '../types/pages.editor.block-color.types';

/**
 * How each colour of the palette is painted, written out one by one.
 *
 * The classes are spelled in full on purpose: the stylesheet is built by
 * reading this source, so a class assembled at run time would simply not
 * exist. Every colour is given a light and a dark reading of its own.
 */
export const PAGE_EDITOR_TEXT_COLOR_CLASSES: readonly string[] = [
  '[&_[data-text-color=gray]]:text-gray-600 dark:[&_[data-text-color=gray]]:text-gray-400',
  '[&_[data-text-color=brown]]:text-amber-800 dark:[&_[data-text-color=brown]]:text-amber-600',
  '[&_[data-text-color=orange]]:text-orange-700 dark:[&_[data-text-color=orange]]:text-orange-400',
  '[&_[data-text-color=yellow]]:text-yellow-700 dark:[&_[data-text-color=yellow]]:text-yellow-300',
  '[&_[data-text-color=green]]:text-green-700 dark:[&_[data-text-color=green]]:text-green-400',
  '[&_[data-text-color=blue]]:text-blue-700 dark:[&_[data-text-color=blue]]:text-blue-400',
  '[&_[data-text-color=purple]]:text-purple-700 dark:[&_[data-text-color=purple]]:text-purple-400',
  '[&_[data-text-color=red]]:text-red-700 dark:[&_[data-text-color=red]]:text-red-400',
];

/**
 * A background is a tint, not a paint: light enough by day to read black text
 * on, and by night a wash of the same colour over the page rather than a solid
 * block that would shout across a dark room.
 */
export const PAGE_EDITOR_BACKGROUND_COLOR_CLASSES: readonly string[] = [
  '[&_[data-background-color]]:px-2 [&_[data-background-color]]:py-1',
  '[&_[data-background-color=gray]]:bg-gray-100 dark:[&_[data-background-color=gray]]:bg-gray-400/20',
  '[&_[data-background-color=brown]]:bg-amber-100 dark:[&_[data-background-color=brown]]:bg-amber-700/25',
  '[&_[data-background-color=orange]]:bg-orange-100 dark:[&_[data-background-color=orange]]:bg-orange-500/20',
  '[&_[data-background-color=yellow]]:bg-yellow-100 dark:[&_[data-background-color=yellow]]:bg-yellow-500/20',
  '[&_[data-background-color=green]]:bg-green-100 dark:[&_[data-background-color=green]]:bg-green-500/20',
  '[&_[data-background-color=blue]]:bg-blue-100 dark:[&_[data-background-color=blue]]:bg-blue-500/20',
  '[&_[data-background-color=purple]]:bg-purple-100 dark:[&_[data-background-color=purple]]:bg-purple-500/20',
  '[&_[data-background-color=red]]:bg-red-100 dark:[&_[data-background-color=red]]:bg-red-500/25',
];

/** The swatch each colour shows in the menu, so a colour is chosen by seeing it. */
export const PAGE_EDITOR_COLOR_SWATCH_CLASSES: Readonly<Record<string, string>> = {
  blue: 'bg-blue-500',
  brown: 'bg-amber-700',
  gray: 'bg-gray-500',
  green: 'bg-green-600',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  red: 'bg-red-600',
  yellow: 'bg-yellow-500',
};

export const PAGE_EDITOR_COLOR_SWATCH_STYLE_CLASS = 'size-3 shrink-0 border border-border';

/** Which attribute of a block each kind of colour is written to. */
export const PAGE_EDITOR_COLOR_ATTRS: Readonly<Record<PageEditorBlockColorKind, string>> = {
  background: 'backgroundColor',
  text: 'textColor',
};
