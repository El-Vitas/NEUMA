import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeChoice, ThemeReading } from '@/shared/types/theme.types';

/** What a person can ask for: the light theme, the dark one, or whatever their system says. */
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

export const DEFAULT_THEME_CHOICE: ThemeChoice = 'system';

/** What was asked for, kept where the server can read it and answer with the page already dressed. */
export const THEME_CHOICE_COOKIE = 'company-brain-theme';

/** How the browser last resolved that choice, so following the system costs no flash on return. */
export const THEME_READING_COOKIE = 'company-brain-theme-reading';

export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** The wrapper the theme is worn by, marked so the browser can find what the server dressed. */
export const THEME_ROOT_ATTRIBUTE = 'data-theme-root';

/** The class the page wears while it is read at night. */
export const DARK_THEME_CLASS = 'dark';

export const LIGHT_THEME_READING: ThemeReading = 'light';

export const DARK_THEME_READING: ThemeReading = 'dark';

/** Asked of the browser to learn what the system prefers. */
export const DARK_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/** Each choice shown as what it means: a sun, a moon, the screen itself. */
export const THEME_ICONS: Readonly<Record<ThemeChoice, LucideIcon>> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};
