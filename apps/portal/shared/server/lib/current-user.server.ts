import 'server-only';
import type { User } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { ACCESS_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { CURRENT_USER_CACHE_TAG } from '@/shared/constants/current-user-cache.constants';
import { HTTP_STATUS_UNAUTHORIZED } from '@/shared/constants/http.constants';
import { ApiError } from '@/shared/lib/api';
import { apiRequest } from '@/shared/lib/api-server';
import { API_ROUTES } from '@/shared/routes/constants/routes.constants';

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
  cacheTag(CURRENT_USER_CACHE_TAG);

  try {
    return await apiRequest<User>(API_ROUTES.USERS_ME, accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === HTTP_STATUS_UNAUTHORIZED) return null;
    logger.error({
      op: 'getCurrentUser',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
