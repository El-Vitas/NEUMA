import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config } from '@/shared/config';
import { ACCESS_TOKEN_COOKIE, BEARER_PREFIX } from '@/shared/constants/auth.constants';
import { API_ROUTES, ROUTES } from '@/shared/routes/constants/routes.constants';
import { ApiError } from './api';
import { NetworkError, parseJsonBodyStrict } from './parse-json-body';

export const buildHeaders = (accessToken: string | undefined, customHeaders: HeadersInit | undefined): HeadersInit => ({
  'Content-Type': 'application/json',
  ...customHeaders,
  ...(accessToken === undefined ? {} : { authorization: `${BEARER_PREFIX}${accessToken}` }),
});

export const buildUrl = (endpoint: string): string =>
  endpoint.startsWith('http') ? endpoint : `${config.backendApiUrl}${endpoint}`;

export const apiRequest = async <T>(
  endpoint: string,
  accessToken: string | undefined,
  init: RequestInit = {},
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(buildUrl(endpoint), {
      ...init,
      headers: buildHeaders(accessToken, init.headers),
    });
  } catch (error) {
    throw new NetworkError(error);
  }

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  return parseJsonBodyStrict<T>(response);
};

const request = async <T>(endpoint: string, init: RequestInit = {}): Promise<T> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  let caughtError: unknown;
  try {
    return await apiRequest<T>(endpoint, accessToken, init);
  } catch (error) {
    caughtError = error;
  }

  if (caughtError instanceof ApiError && caughtError.status === 401 && endpoint !== API_ROUTES.AUTH_SESSIONS) {
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    redirect(ROUTES.LOGIN);
  }

  throw caughtError;
};

export const apiServer = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  del: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
