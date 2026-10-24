'use server';
import { getLocale } from 'next-intl/server';
import { actionClient } from '@/lib/safe-action';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { redirect } from '../../../i18n/navigation';
import { loginSchema } from '../schemas/auth.schemas';
import { loginUser } from '../server/lib/auth.server';
import { setSessionCookies } from '../server/lib/cookie.helpers.server';

export const loginAction = actionClient.inputSchema(loginSchema).action(async ({ parsedInput }) => {
  const session = await loginUser(parsedInput);
  await setSessionCookies(session);
  redirect({ href: ROUTES.PORTAL, locale: await getLocale() });
});
