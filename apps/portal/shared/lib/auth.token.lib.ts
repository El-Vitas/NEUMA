import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from '@/shared/constants/auth.constants';

export class MissingAccessTokenError extends Error {
  constructor() {
    super('Authentication is required for this action');
    this.name = 'MissingAccessTokenError';
  }
}

export const readAccessTokenCookie = async (): Promise<string | undefined> => {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
};

export const requireAccessTokenCookie = async (): Promise<string> => {
  const accessToken = await readAccessTokenCookie();
  if (accessToken === undefined) throw new MissingAccessTokenError();
  return accessToken;
};
