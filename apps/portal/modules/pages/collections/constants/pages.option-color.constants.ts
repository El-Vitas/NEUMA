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

/**
 * El mismo color, pero como superficie de una columna entera.
 *
 * Mucho más tenue que la etiqueta: aquí el color pinta el fondo de todo lo que
 * la columna lleva, y al tono de una etiqueta las tarjetas de encima dejarían
 * de leerse.
 */
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

/** La superficie de una columna cuyo valor no eligió color. */
export const PAGE_OPTION_NO_SURFACE_CLASS = 'bg-muted/40';

/**
 * El color reducido a un punto.
 *
 * Donde el color ya está puesto alrededor —el fondo de una columna entera— el
 * nombre no necesita además ir teñido: bastan un punto que lo repita y el
 * nombre en su tinta normal, que es lo que se lee.
 */
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

/** El punto de un valor que no eligió color. */
export const PAGE_OPTION_NO_DOT_CLASS = 'bg-muted-foreground/50';

/**
 * El mismo color, pero para pintar una figura de un dibujo.
 *
 * Un gráfico pinta formas y no cajas, y va a fondo lleno: aquí el color **es**
 * el dato, no el adorno de una etiqueta. Cada tono se aclara en modo oscuro,
 * porque un azul que se lee sobre papel se pierde sobre un fondo negro.
 */
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

/** Lo que se pinta cuando el valor no eligió color: la tinta del tema, que se da vuelta sola. */
export const PAGE_OPTION_NO_FILL_CLASS = 'fill-muted-foreground';
