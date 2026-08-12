import { describe, expect, it, mock } from 'bun:test';

let cookieValue: string | undefined;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
);
const updateTagMock = mock(() => undefined);

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ updateTag: updateTagMock }));
mock.module('next/headers', () => ({
  cookies: async () => ({
    get: () => (cookieValue === undefined ? undefined : { value: cookieValue }),
    delete: () => undefined,
  }),
}));
mock.module('next-intl/server', () => ({ getLocale: async () => 'en' }));
mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
mock.module('@/lib/safe-action', () => ({
  actionClient: {
    schema: () => ({
      action: (handler: (input: { readonly parsedInput: unknown }) => Promise<unknown>) => async (input: unknown) => {
        try {
          return { data: await handler({ parsedInput: input }) };
        } catch (error) {
          return { serverError: error instanceof Error ? error.message : 'unknown error' };
        }
      },
    }),
  },
}));
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));

globalThis.fetch = Object.assign(fetchMock, { preconnect: (): void => undefined });

const { createUserAction, updateUserNameAction } = await import('@/modules/users/server/actions/users.actions');

const userId = '44444444-4444-4444-8444-444444444444';

describe('updateUserNameAction without an access token', () => {
  it('rejects without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await updateUserNameAction({ name: 'Ana', userId });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });
});

describe('updateUserNameAction with an access token', () => {
  it('makes the outbound request and invalidates the cache', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await updateUserNameAction({ name: 'Ana', userId });

    expect(result).toEqual({ data: undefined });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalledWith('users');
  });
});

describe('createUserAction without an access token', () => {
  it('is an intentionally public registration call and still reaches the backend', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();
    fetchMock.mockImplementationOnce(
      async (): Promise<Response> =>
        new Response(
          JSON.stringify({
            accessToken: 'issued-token',
            accessTokenExpiresInSeconds: 900,
            refreshToken: 'issued-refresh-token',
            refreshTokenExpiresInSeconds: 604_800,
            user: { email: 'ana@example.com', id: userId, name: 'Ana', role: 'WORKER' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );

    const result = await createUserAction({ email: 'ana@example.com', name: 'Ana', password: 'super-secret' });

    expect(result).toEqual({ data: undefined });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalledWith('users');
  });
});
