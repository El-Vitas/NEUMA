import { describe, expect, it, mock } from 'bun:test';
import { installFetchMock } from '../../../mocks/global-fetch.mock';

let cookieValue: string | undefined;
const deleteMock = mock(() => undefined);
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
);
const redirectMock = mock(() => undefined);

mock.module('next/headers', () => ({
  cookies: async () => ({
    get: () => (cookieValue === undefined ? undefined : { value: cookieValue }),
    delete: deleteMock,
  }),
}));
mock.module('next-intl/server', () => ({ getLocale: async () => 'en' }));
mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
mock.module('../../i18n/navigation', () => ({ redirect: redirectMock }));

installFetchMock(fetchMock);

const { apiServer } = await import('@/shared/lib/api-server');

describe('apiServer against a route that requires authentication', () => {
  it('refuses without making an outbound request when there is no access token', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();

    await expect(apiServer.patch('/api/v1/users/user-1', { name: 'Ana' })).rejects.toThrow(
      'Authentication is required for this action',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes the outbound request when there is an access token', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();

    await apiServer.patch('/api/v1/users/user-1', { name: 'Ana' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('apiServer against a genuinely public route', () => {
  it('makes the outbound request without an access token', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    fetchMock.mockImplementationOnce(
      async (): Promise<Response> =>
        new Response('{"accessToken":"issued-token"}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    const result = await apiServer.post<{ accessToken: string }>('/api/v1/auth/sessions', {
      email: 'ana@example.com',
      password: 'super-secret',
    });

    expect(result).toEqual({ accessToken: 'issued-token' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('apiServer request headers', () => {
  it('does not declare a JSON body for a delete request without a body', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    fetchMock.mockImplementationOnce(
      async (): Promise<Response> =>
        new Response('{"pageId":"page-1"}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await apiServer.del('/api/v1/favorites/page-1');

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(requestInit?.headers).has('Content-Type')).toBe(false);
  });
});

describe('apiServer.del', () => {
  // Signing out answers 204 with no body; reading one made the sign-out fail before it could redirect.
  it('accepts a deletion answered with no content', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockImplementationOnce(async (): Promise<Response> => new Response(null, { status: 204 }));

    await expect(apiServer.del('/api/v1/auth/sessions/current')).resolves.toBeUndefined();
  });
});
