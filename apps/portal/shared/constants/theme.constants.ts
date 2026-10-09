import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeChoice, ThemeReading } from '@/shared/types/theme.types';

export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

export const DEFAULT_THEME_CHOICE: ThemeChoice = 'system';

/** Cookies, so the server can render the page already themed. */
export const THEME_CHOICE_COOKIE = 'neuma-theme';

export const THEME_READING_COOKIE = 'neuma-theme-reading';

export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const THEME_ROOT_ATTRIBUTE = 'data-theme-root';

export const DARK_THEME_CLASS = 'dark';

export const LIGHT_THEME_READING: ThemeReading = 'light';

export const DARK_THEME_READING: ThemeReading = 'dark';

export const DARK_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const THEME_ICONS: Readonly<Record<ThemeChoice, LucideIcon>> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};
