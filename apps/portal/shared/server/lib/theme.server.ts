import 'server-only';

import { cookies } from 'next/headers';
import { THEME_CHOICE_COOKIE, THEME_READING_COOKIE } from '@/shared/constants/theme.constants';
import { readThemeChoice, readThemeReading } from '@/shared/lib/theme.lib';
import type { ThemeChoice, ThemeReading } from '@/shared/types/theme.types';

/** Both the choice and the resolved reading are stored, so the page renders themed before scripts run. */
export const readRequestTheme = async (): Promise<{
  readonly choice: ThemeChoice;
  readonly reading: ThemeReading;
}> => {
  const jar = await cookies();
  const choice = readThemeChoice(jar.get(THEME_CHOICE_COOKIE)?.value);
  return { choice, reading: readThemeReading(choice, jar.get(THEME_READING_COOKIE)?.value) };
};
