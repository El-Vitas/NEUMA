import { routing } from '@/i18n/routing';

export const LANGUAGE_CHOICES: readonly string[] = routing.locales;

export const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  en: 'English',
  es: 'Español',
};
