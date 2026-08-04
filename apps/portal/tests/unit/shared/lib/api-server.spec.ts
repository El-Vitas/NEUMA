import { describe, expect, it, mock } from 'bun:test';

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

globalThis.fetch = Object.assign(fetchMock, { preconnect: (): void => undefined });

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
