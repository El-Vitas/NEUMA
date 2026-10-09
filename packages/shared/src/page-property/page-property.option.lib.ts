import type { PageOptionColor, PagePropertyOption } from './page-property.types.js';
import { isOneOf } from '../value-list.lib.js';
import { PAGE_OPTION_COLOR, PAGE_OPTION_COLOR_VALUES } from './page-property.types.js';

const isKnownColor = (candidate: unknown): candidate is PageOptionColor =>
  typeof candidate === 'string' && isOneOf(PAGE_OPTION_COLOR_VALUES, candidate);

const readOption = (stored: unknown): PagePropertyOption | null => {
  if (typeof stored === 'string') return stored === '' ? null : { color: null, value: stored };
  if (stored === null || typeof stored !== 'object') return null;
  const { color, value } = stored as { color?: unknown; value?: unknown };
  if (typeof value !== 'string' || value === '') return null;
  return { color: isKnownColor(color) ? color : null, value };
};

/**
 * The options a property offers, read from whatever the store holds.
 *
 * A collection written before options had colors kept them as a plain list of
 * names, and those are still read — they simply carry no color. Reading is
 * forgiving because the alternative is a page that refuses to open over a color
 * nobody typed.
 */
export const readPagePropertyOptions = (stored: unknown): readonly PagePropertyOption[] | null => {
  if (!Array.isArray(stored)) return null;
  return stored.map(readOption).filter((option): option is PagePropertyOption => option !== null);
};

/** The names alone, for whoever only needs to know which values a property allows. */
export const readPagePropertyOptionValues = (stored: unknown): readonly string[] | null =>
  readPagePropertyOptions(stored)?.map((option) => option.value) ?? null;

/** A color for the option standing at this place in the list, starting the palette over when it runs out. */
export const pickPageOptionColor = (index: number): PageOptionColor =>
  PAGE_OPTION_COLOR_VALUES[index % PAGE_OPTION_COLOR_VALUES.length] ?? PAGE_OPTION_COLOR.GRAY;
