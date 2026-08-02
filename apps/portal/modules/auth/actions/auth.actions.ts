'use server';
import { redirect } from 'next/navigation';
import { actionClient } from '@/lib/safe-action';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { loginSchema, registerSchema } from '../schemas/auth.schemas';
import { loginUser, logoutUser, registerUser } from '../server/lib/auth.server';
import { clearAccessTokenCookie, setAccessTokenCookie } from '../server/lib/cookie.helpers.server';

export const loginAction = actionClient.inputSchema(loginSchema).action(async ({ parsedInput }) => {
  const session = await loginUser(parsedInput);
  await setAccessTokenCookie(session.accessToken);
  redirect(ROUTES.PORTAL);
});

export const registerAction = actionClient.inputSchema(registerSchema).action(async ({ parsedInput }) => {
  const session = await registerUser(parsedInput);
  await setAccessTokenCookie(session.accessToken);
  redirect(ROUTES.PORTAL);
});

export const logoutAction = actionClient.action(async () => {
  await logoutUser();
  await clearAccessTokenCookie();
  redirect(ROUTES.LOGIN);
});
