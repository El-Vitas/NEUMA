import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { apiRequest } from '@/shared/lib/api-server';
import { API_ROUTES } from '@/shared/routes/constants/routes.constants';
import type { User } from '../../types/auth.types';

export const getCurrentUser = async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (token === undefined) {
    return null;
  }

  return getCurrentUserCached(token);
};

const getCurrentUserCached = async (accessToken: string): Promise<User | null> => {
  'use cache';
  cacheLife('seconds');
  cacheTag('current-user');

  try {
    return await apiRequest<User>(API_ROUTES.USERS_ME, accessToken);
  } catch {
    return null;
  }
};
