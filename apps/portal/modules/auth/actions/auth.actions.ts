'use server';
import { getLocale } from 'next-intl/server';
import { actionClient } from '@/lib/safe-action';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { redirect } from '../../../i18n/navigation';
import { loginSchema, registerSchema } from '../schemas/auth.schemas';
import { loginUser, logoutUser, registerUser } from '../server/lib/auth.server';
import { clearSessionCookies, setSessionCookies } from '../server/lib/cookie.helpers.server';

export const loginAction = actionClient.inputSchema(loginSchema).action(async ({ parsedInput }) => {
  const session = await loginUser(parsedInput);
  await setSessionCookies(session);
  redirect({ href: ROUTES.PORTAL, locale: await getLocale() });
});

export const registerAction = actionClient.inputSchema(registerSchema).action(async ({ parsedInput }) => {
  const session = await registerUser(parsedInput);
  await setSessionCookies(session);
  redirect({ href: ROUTES.PORTAL, locale: await getLocale() });
});

export const logoutAction = actionClient.action(async () => {
  await logoutUser();
  await clearSessionCookies();
  redirect({ href: ROUTES.LOGIN, locale: await getLocale() });
});
