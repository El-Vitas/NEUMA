import 'server-only';

import { cookies } from 'next/headers';
import { THEME_CHOICE_COOKIE, THEME_READING_COOKIE } from '@/shared/constants/theme.constants';
import { readThemeChoice, readThemeReading } from '@/shared/lib/theme.lib';
import type { ThemeChoice, ThemeReading } from '@/shared/types/theme.types';

/**
 * How this browser reads the interface, as far as the server can tell.
 *
 * Both the choice and the reading the browser resolved are kept, so the page
 * can be sent already dressed instead of arriving light and turning dark once
 * the scripts have run.
 */
export const readRequestTheme = async (): Promise<{
  readonly choice: ThemeChoice;
  readonly reading: ThemeReading;
}> => {
  const jar = await cookies();
  const choice = readThemeChoice(jar.get(THEME_CHOICE_COOKIE)?.value);
  return { choice, reading: readThemeReading(choice, jar.get(THEME_READING_COOKIE)?.value) };
};
