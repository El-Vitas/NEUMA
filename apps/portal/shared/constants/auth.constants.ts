import { API_ROUTES } from '@/shared/routes/constants/routes.constants';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const BEARER_PREFIX = 'Bearer ';

export const PUBLIC_API_REQUESTS: ReadonlyArray<{ readonly method: string; readonly endpoint: string }> = [
  { method: 'POST', endpoint: API_ROUTES.AUTH_SESSIONS },
  { method: 'POST', endpoint: API_ROUTES.USERS },
  { method: 'POST', endpoint: API_ROUTES.AUTH_SESSIONS_REFRESH },
];
