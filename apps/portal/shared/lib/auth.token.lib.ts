import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { MissingAccessTokenError } from './auth.token.error';

export const readAccessTokenCookie = async (): Promise<string | undefined> => {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
};

export const requireAccessTokenCookie = async (): Promise<string> => {
  const accessToken = await readAccessTokenCookie();
  if (accessToken === undefined) throw new MissingAccessTokenError();
  return accessToken;
};
