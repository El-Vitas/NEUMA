import {
  DARK_THEME_CLASS,
  DARK_THEME_READING,
  DEFAULT_THEME_CHOICE,
  LIGHT_THEME_READING,
  THEME_CHOICES,
  THEME_ROOT_ATTRIBUTE,
} from '@/shared/constants/theme.constants';
import type { ThemeChoice, ThemeReading } from '@/shared/types/theme.types';

/**
 * What was asked for on the last visit, or following the system when nothing
 * was asked — or when what was kept is no longer a choice this interface
 * offers.
 */
export const readThemeChoice = (stored: string | undefined): ThemeChoice =>
  THEME_CHOICES.find((choice) => choice === stored) ?? DEFAULT_THEME_CHOICE;

/** How the page ends up being read: what was asked for, or what the system prefers. */
export const resolveThemeReading = (choice: ThemeChoice, prefersDark: boolean): ThemeReading => {
  if (choice === 'system') return prefersDark ? DARK_THEME_READING : LIGHT_THEME_READING;
  return choice;
};

/**
 * How the page should be dressed before the browser has said anything.
 *
 * Whoever follows the system is dressed as the browser last resolved it, which
 * is why that answer is kept alongside the choice: it spares the reader a page
 * that arrives light and turns dark in front of them.
 */
export const readThemeReading = (choice: ThemeChoice, lastReading: string | undefined): ThemeReading => {
  if (choice !== 'system') return choice;
  return lastReading === DARK_THEME_READING ? DARK_THEME_READING : LIGHT_THEME_READING;
};

/** The class the page wears, which is all the stylesheet needs to change everything. */
export const readThemeClass = (reading: ThemeReading): string =>
  reading === DARK_THEME_READING ? DARK_THEME_CLASS : '';

/** Dresses the page in the reading it was given. */
export const applyThemeReading = (root: Element, reading: ThemeReading): void => {
  root.classList.toggle(DARK_THEME_CLASS, reading === DARK_THEME_READING);
};

/**
 * The element the theme is worn by: the wrapper the server dressed, so a change
 * made here lands where the page was already dressed and not somewhere above it.
 */
export const findThemeRoot = (page: Document): Element =>
  page.querySelector(`[${THEME_ROOT_ATTRIBUTE}]`) ?? page.documentElement;
