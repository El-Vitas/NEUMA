import 'server-only';
import { cookies } from 'next/headers';
import { config } from '@/shared/config';
import { ACCESS_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { ACCESS_TOKEN_MAX_AGE_SECONDS, COOKIE_PATH } from '../../constants/cookie.options.constants';

const buildCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  path: COOKIE_PATH,
  maxAge,
});

export const setAccessTokenCookie = async (accessToken: string): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, buildCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS));
};

export const clearAccessTokenCookie = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
};
