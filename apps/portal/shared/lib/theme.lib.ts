import {
  DARK_THEME_CLASS,
  DARK_THEME_READING,
  DEFAULT_THEME_CHOICE,
  LIGHT_THEME_READING,
  THEME_CHOICES,
  THEME_ROOT_ATTRIBUTE,
} from '@/shared/constants/theme.constants';
import type { ThemeChoice, ThemeReading } from '@/shared/types/theme.types';

export const readThemeChoice = (stored: string | undefined): ThemeChoice =>
  THEME_CHOICES.find((choice) => choice === stored) ?? DEFAULT_THEME_CHOICE;

export const resolveThemeReading = (choice: ThemeChoice, prefersDark: boolean): ThemeReading => {
  if (choice === 'system') return prefersDark ? DARK_THEME_READING : LIGHT_THEME_READING;
  return choice;
};

/** Following the system uses the reading the browser last resolved, avoiding a light-to-dark flash. */
export const readThemeReading = (choice: ThemeChoice, lastReading: string | undefined): ThemeReading => {
  if (choice !== 'system') return choice;
  return lastReading === DARK_THEME_READING ? DARK_THEME_READING : LIGHT_THEME_READING;
};

export const readThemeClass = (reading: ThemeReading): string =>
  reading === DARK_THEME_READING ? DARK_THEME_CLASS : '';

export const applyThemeReading = (root: Element, reading: ThemeReading): void => {
  root.classList.toggle(DARK_THEME_CLASS, reading === DARK_THEME_READING);
};

/** The wrapper the server themed, so changes land where the page was already themed. */
export const findThemeRoot = (page: Document): HTMLElement =>
  page.querySelector<HTMLElement>(`[${THEME_ROOT_ATTRIBUTE}]`) ?? page.documentElement;
