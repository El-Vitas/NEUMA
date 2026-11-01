import 'server-only';
import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { logger } from '@/lib/logger';
import { ACCESS_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { apiServer } from '@/shared/lib/api-server';
import { API_ROUTES, ROUTES } from '@/shared/routes/constants/routes.constants';
import { redirect } from '../../../../i18n/navigation';
import { authSessionSchema } from '../../schemas/auth.schemas';
import type { AuthSession, LoginInput, SignInAgainOutcome } from '../../types/auth.types';
import { clearSessionCookies, setSessionCookies } from './cookie.helpers.server';

export const requireAuth = async (): Promise<void> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE);
  if (!token) {
    redirect({ href: ROUTES.LOGIN, locale: await getLocale() });
  }
};

export const loginUser = async (input: LoginInput): Promise<AuthSession> => {
  const data = await apiServer.post<unknown>(API_ROUTES.AUTH_SESSIONS, input);
  return authSessionSchema.parse(data);
};

/** Changing the password revokes every refresh token, the browser's too, so it signs in again with the new one. */
export const signInAgain = async (input: LoginInput): Promise<void> => {
  await setSessionCookies(await loginUser(input));
};

/**
 * The password is already changed when this runs and every refresh token is revoked, so a failed sign-in is not an
 * error of the change: the old cookies are dropped so the login page opens instead of bouncing back to the portal.
 */
export const signInAgainOrReleaseSession = async (input: LoginInput): Promise<SignInAgainOutcome> => {
  try {
    await signInAgain(input);
    return { status: 'signedIn' };
  } catch (error) {
    unstable_rethrow(error);
    logger.warn({ action: 'signInAgain', error: error instanceof Error ? error.message : String(error) });
    await clearSessionCookies();
    return { status: 'signInRequired' };
  }
};

export const logoutUser = async (): Promise<void> => {
  await apiServer.del(API_ROUTES.AUTH_SESSIONS_CURRENT);
};
