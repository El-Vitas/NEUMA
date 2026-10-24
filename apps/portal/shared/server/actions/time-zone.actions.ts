'use server';

import 'server-only';

import { cookies } from 'next/headers';
import { actionClient } from '@/lib/safe-action';
import { TIME_ZONE_COOKIE, TIME_ZONE_COOKIE_MAX_AGE_SECONDS } from '@/shared/constants/time-zone.constants';
import { timeZoneSchema } from '@/shared/schemas/time-zone.schemas';

export const rememberTimeZoneAction = actionClient.inputSchema(timeZoneSchema).action(async ({ parsedInput }) => {
  const jar = await cookies();
  jar.set(TIME_ZONE_COOKIE, parsedInput.timeZone, {
    maxAge: TIME_ZONE_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
  });
});
