import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { config } from '@/shared/config';
import { ACCESS_TOKEN_COOKIE, BEARER_PREFIX, PUBLIC_API_REQUESTS } from '@/shared/constants/auth.constants';
import { API_ROUTES, ROUTES } from '@/shared/routes/constants/routes.constants';
import type { DownloadedFile } from '@/shared/types/downloaded-file.types';
import { redirect } from '../../i18n/navigation';
import { ApiError } from './api';
import { MissingAccessTokenError } from './auth.token.error';
import { readAccessTokenCookie } from './auth.token.lib';
import { NetworkError, parseJsonBodyStrict } from './parse-json-body';

export const buildHeaders = (
  accessToken: string | undefined,
  customHeaders: HeadersInit | undefined,
  hasBody = true,
): HeadersInit => ({
  ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
  ...customHeaders,
  ...(accessToken === undefined ? {} : { authorization: `${BEARER_PREFIX}${accessToken}` }),
});

export const buildUrl = (endpoint: string): string =>
  endpoint.startsWith('http') ? endpoint : `${config.backendApiUrl}${endpoint}`;

/**
 * The backend's answer, once it arrived and said yes. Not reaching it is told
 * apart from it saying no: the first is being offline, the second carries its
 * own status.
 */
const fetchAcceptedResponse = async (
  endpoint: string,
  accessToken: string | undefined,
  init: RequestInit,
): Promise<Response> => {
  let response: Response;
  try {
    response = await fetch(buildUrl(endpoint), {
      ...init,
      headers: buildHeaders(accessToken, init.headers, init.body !== undefined),
    });
  } catch (error) {
    throw new NetworkError(error);
  }
  if (!response.ok) throw await ApiError.fromResponse(response);
  return response;
};

const sendApiRequest = async <T>(endpoint: string, accessToken: string | undefined, init: RequestInit): Promise<T> =>
  parseJsonBodyStrict<T>(await fetchAcceptedResponse(endpoint, accessToken, init));

export const apiRequest = async <T>(endpoint: string, accessToken: string, init: RequestInit = {}): Promise<T> =>
  sendApiRequest<T>(endpoint, accessToken, init);

/**
 * A response the backend sends as a file rather than as data.
 *
 * The bytes travel encoded because a server action answers in JSON, and an
 * archive is not text — sending it as text would quietly corrupt it.
 */
export const apiRequestFile = async (endpoint: string, accessToken: string): Promise<DownloadedFile> => {
  const response = await fetchAcceptedResponse(endpoint, accessToken, {});
  return {
    base64: Buffer.from(await response.arrayBuffer()).toString('base64'),
    mediaType: response.headers.get('content-type') ?? 'application/octet-stream',
  };
};

/** A response the backend sends as text, such as a page exported as Markdown. */
export const apiRequestText = async (endpoint: string, accessToken: string): Promise<string> =>
  (await fetchAcceptedResponse(endpoint, accessToken, {})).text();

const isPublicRequest = (endpoint: string, method: string): boolean =>
  PUBLIC_API_REQUESTS.some((candidate) => candidate.endpoint === endpoint && candidate.method === method);

const request = async <T>(endpoint: string, init: RequestInit = {}): Promise<T> => {
  const cookieStore = await cookies();
  const accessToken = await readAccessTokenCookie();
  const method = init.method ?? 'GET';

  if (accessToken === undefined && !isPublicRequest(endpoint, method)) {
    throw new MissingAccessTokenError();
  }

  let caughtError: unknown;
  try {
    return await sendApiRequest<T>(endpoint, accessToken, init);
  } catch (error) {
    caughtError = error;
  }

  if (caughtError instanceof ApiError && caughtError.status === 401 && endpoint !== API_ROUTES.AUTH_SESSIONS) {
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    redirect({ href: ROUTES.LOGIN, locale: await getLocale() });
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
