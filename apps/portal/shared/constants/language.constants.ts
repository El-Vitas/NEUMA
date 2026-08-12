import { Languages } from 'lucide-react';
import { routing } from '@/i18n/routing';

/** The languages this interface is written in, read from the routing that serves them. */
export const LANGUAGE_CHOICES: readonly string[] = routing.locales;

/** What each language calls itself, so it is recognised without knowing the current one. */
export const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  en: 'English',
  es: 'Español',
};

export const LANGUAGE_ICON = Languages;
