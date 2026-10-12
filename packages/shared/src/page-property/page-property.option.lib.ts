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

/** Also accepts the legacy plain list of names (no color); lenient so a page never fails to open over a color. */
export const readPagePropertyOptions = (stored: unknown): readonly PagePropertyOption[] | null => {
  if (!Array.isArray(stored)) return null;
  return stored.map(readOption).filter((option): option is PagePropertyOption => option !== null);
};

export const readPagePropertyOptionValues = (stored: unknown): readonly string[] | null =>
  readPagePropertyOptions(stored)?.map((option) => option.value) ?? null;

/** Cycles the palette when the index runs past it. */
export const pickPageOptionColor = (index: number): PageOptionColor =>
  PAGE_OPTION_COLOR_VALUES[index % PAGE_OPTION_COLOR_VALUES.length] ?? PAGE_OPTION_COLOR.GRAY;
