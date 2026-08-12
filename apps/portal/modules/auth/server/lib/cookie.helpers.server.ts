import 'server-only';
import { cookies } from 'next/headers';
import { config } from '@/shared/config';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { COOKIE_PATH } from '../../constants/cookie.options.constants';
import type { AuthSession } from '../../types/auth.types';

const buildCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  path: COOKIE_PATH,
  maxAge,
});

/**
 * Stores a session, each cookie kept for exactly as long as the token it
 * carries is valid.
 *
 * Keeping a cookie for longer than its token is what made sessions look alive
 * while every request was already being rejected.
 */
export const setSessionCookies = async (session: AuthSession): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, session.accessToken, buildCookieOptions(session.accessTokenExpiresInSeconds));
  cookieStore.set(REFRESH_TOKEN_COOKIE, session.refreshToken, buildCookieOptions(session.refreshTokenExpiresInSeconds));
};

export const clearSessionCookies = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
};
