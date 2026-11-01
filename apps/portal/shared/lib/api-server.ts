import { cookies, headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { config } from '@/shared/config';
import { ACCESS_TOKEN_COOKIE, BEARER_PREFIX, PUBLIC_API_REQUESTS } from '@/shared/constants/auth.constants';
import {
  BACKEND_FILE_REQUEST_TIMEOUT_MILLISECONDS,
  BACKEND_REQUEST_TIMEOUT_MILLISECONDS,
} from '@/shared/constants/backend-request.constants';
import { API_ROUTES, ROUTES } from '@/shared/routes/constants/routes.constants';
import type { DownloadedFile } from '@/shared/types/downloaded-file.types';
import { redirect } from '../../i18n/navigation';
import { ApiError } from './api';
import { MissingAccessTokenError } from './auth.token.error';
import { readAccessTokenCookie } from './auth.token.lib';
import { forwardedForHeaders, readClientIp } from './client-ip.lib';
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

export const buildUrl = (endpoint: string): string => `${config.backendApiUrl}${endpoint}`;

/** Not reaching the backend (offline) is distinct from it answering with an error status. */
const fetchAcceptedResponse = async (
  endpoint: string,
  accessToken: string | undefined,
  init: RequestInit,
  timeoutMilliseconds = BACKEND_REQUEST_TIMEOUT_MILLISECONDS,
): Promise<Response> => {
  let response: Response;
  try {
    response = await fetch(buildUrl(endpoint), {
      ...init,
      headers: buildHeaders(accessToken, init.headers, init.body !== undefined),
      signal: AbortSignal.timeout(timeoutMilliseconds),
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

/** Bytes are encoded because a server action answers in JSON; sending an archive as text would corrupt it. */
export const apiRequestFile = async (endpoint: string, accessToken: string): Promise<DownloadedFile> => {
  const response = await fetchAcceptedResponse(endpoint, accessToken, {}, BACKEND_FILE_REQUEST_TIMEOUT_MILLISECONDS);
  return {
    base64: Buffer.from(await response.arrayBuffer()).toString('base64'),
    mediaType: response.headers.get('content-type') ?? 'application/octet-stream',
  };
};

export const apiRequestText = async (endpoint: string, accessToken: string): Promise<string> =>
  (await fetchAcceptedResponse(endpoint, accessToken, {})).text();

const isPublicRequest = (endpoint: string, method: string): boolean =>
  PUBLIC_API_REQUESTS.some((candidate) => candidate.endpoint === endpoint && candidate.method === method);

const isUnauthorized = (error: unknown): boolean => error instanceof ApiError && error.status === 401;

/** Asked outside any cache: a cached query keeps only a digest of its error, so its 401 cannot be read. */
export const isSessionRejected = async (accessToken: string): Promise<boolean> => {
  try {
    await fetchAcceptedResponse(API_ROUTES.USERS_ME, accessToken, {});
    return false;
  } catch (error) {
    return isUnauthorized(error);
  }
};

/** A deletion may answer 204 with nothing to read, so its body is not parsed. */
const discardBody = async (): Promise<void> => undefined;

const request = async <T>(
  endpoint: string,
  init: RequestInit,
  readBody: (response: Response) => Promise<T>,
): Promise<T> => {
  const cookieStore = await cookies();
  const accessToken = await readAccessTokenCookie();
  const method = init.method ?? 'GET';

  if (accessToken === undefined && !isPublicRequest(endpoint, method)) {
    throw new MissingAccessTokenError();
  }

  const forwardedInit = {
    ...init,
    headers: { ...init.headers, ...forwardedForHeaders(readClientIp(await headers(), config.clientIpTrust)) },
  };
  let caughtError: unknown;
  try {
    return await readBody(await fetchAcceptedResponse(endpoint, accessToken, forwardedInit));
  } catch (error) {
    caughtError = error;
  }

  if (isUnauthorized(caughtError) && endpoint !== API_ROUTES.AUTH_SESSIONS) {
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    redirect({ href: ROUTES.LOGIN, locale: await getLocale() });
  }

  throw caughtError;
};

export const apiServer = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }, parseJsonBodyStrict),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }, parseJsonBodyStrict),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }, parseJsonBodyStrict),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }, parseJsonBodyStrict),
  patchDiscardingBody: (endpoint: string, body: unknown): Promise<void> =>
    request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }, discardBody),
  del: (endpoint: string): Promise<void> => request(endpoint, { method: 'DELETE' }, discardBody),
};
