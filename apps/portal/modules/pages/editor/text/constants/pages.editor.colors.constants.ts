import type { PageEditorBlockColorKind } from '../../blocks/types/pages.editor.block-color.types';

/** Class names are spelled out in full: Tailwind scans this source, so runtime-built classes would not exist. */
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

export const PAGE_EDITOR_COLOR_ATTRS: Readonly<Record<PageEditorBlockColorKind, string>> = {
  background: 'backgroundColor',
  text: 'textColor',
};
