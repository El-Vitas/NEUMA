import { describe, expect, it, mock } from 'bun:test';
import { installFetchMock } from '../../../../mocks/global-fetch.mock';
import { createSafeActionMock } from '../../../../mocks/safe-action.mock';

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
  headers: async () => new Headers(),
}));
mock.module('next-intl/server', () => ({ getLocale: async () => 'en' }));
mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
mock.module('@/lib/safe-action', createSafeActionMock);
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));

let signedInUser: { readonly id: string; readonly role: string } | null = null;
mock.module('@/shared/server/lib/current-user.server', () => ({ getCurrentUser: async () => signedInUser }));

installFetchMock(fetchMock);

const { createUserAction, updateUserNameAction } = await import('@/modules/users/server/actions/users.actions');

const userId = '44444444-4444-4444-8444-444444444444';

describe('updateUserNameAction without a session', () => {
  it('rejects without making an outbound request', async () => {
    cookieValue = undefined;
    signedInUser = null;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await updateUserNameAction({ name: 'Ana', userId });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });
});

// An action answers to its own address, so a check on the screen that offers it does not protect it.
describe('updateUserNameAction signed in as somebody who does not run the workspace', () => {
  it('rejects without making an outbound request', async () => {
    cookieValue = 'valid-access-token';
    signedInUser = { id: 'someone-else', role: 'WORKER' };
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await updateUserNameAction({ name: 'Ana', userId });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('updateUserNameAction signed in as whoever runs the workspace', () => {
  it('makes the outbound request and invalidates the cache', async () => {
    cookieValue = 'valid-access-token';
    signedInUser = { id: 'the-admin', role: 'ADMIN' };
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await updateUserNameAction({ name: 'Ana', userId });

    expect(result).toEqual({ data: undefined });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalledWith('users');
  });
});

describe('createUserAction without a session', () => {
  it('refuses, since the only screen offering it is the one for whoever runs the workspace', async () => {
    cookieValue = undefined;
    signedInUser = null;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await createUserAction({
      email: 'ana@example.com',
      name: 'Ana',
      password: 'super-secret',
      role: 'WORKER',
    });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createUserAction signed in as whoever runs the workspace', () => {
  it('asks the backend as the admin, with the chosen role, and invalidates the cache', async () => {
    cookieValue = 'valid-access-token';
    signedInUser = { id: 'the-admin', role: 'ADMIN' };
    fetchMock.mockClear();
    updateTagMock.mockClear();
    fetchMock.mockImplementationOnce(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ email: 'ana@example.com', id: userId, name: 'Ana', role: 'WORKER' }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }),
    );

    const result = await createUserAction({
      email: 'ana@example.com',
      name: 'Ana',
      password: 'super-secret',
      role: 'WORKER',
    });

    expect(result).toEqual({ data: undefined });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer valid-access-token');
    expect(JSON.parse(String(init?.body))).toMatchObject({ role: 'WORKER' });
    expect(updateTagMock).toHaveBeenCalledWith('users');
  });
});
