'use server';

import 'server-only';

import { cookies } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import {
  THEME_CHOICE_COOKIE,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_READING_COOKIE,
} from '@/shared/constants/theme.constants';
import { themeDecisionSchema } from '@/shared/schemas/theme.schemas';

export const rememberThemeAction = actionClient.inputSchema(themeDecisionSchema).action(async ({ parsedInput }) => {
  const jar = await cookies();
  const options = { maxAge: THEME_COOKIE_MAX_AGE_SECONDS, path: '/', sameSite: 'lax' } as const;
  jar.set(THEME_CHOICE_COOKIE, parsedInput.choice, options);
  jar.set(THEME_READING_COOKIE, parsedInput.reading, options);
});
