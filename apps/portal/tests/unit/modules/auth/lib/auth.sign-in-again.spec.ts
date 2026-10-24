import { describe, expect, it, mock } from 'bun:test';

const postMock = mock(async (_endpoint: string, _body: unknown): Promise<unknown> => {
  throw new Error('not set');
});
const setSessionCookiesMock = mock(async (_session: unknown): Promise<void> => undefined);
const clearSessionCookiesMock = mock(async (): Promise<void> => undefined);

mock.module('server-only', () => ({}));
mock.module('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
mock.module('next-intl/server', () => ({ getLocale: async () => 'en' }));
mock.module('@/shared/lib/api-server', () => ({ apiServer: { post: postMock } }));
mock.module('@/modules/auth/server/lib/cookie.helpers.server', () => ({
  clearSessionCookies: clearSessionCookiesMock,
  setSessionCookies: setSessionCookiesMock,
}));

const { signInAgainOrReleaseSession } = await import('@/modules/auth/server/lib/auth.server');

const input = { email: 'ana@example.com', password: 'new-password-1' };
const session = {
  accessToken: 'access',
  accessTokenExpiresInSeconds: 900,
  refreshToken: 'refresh',
  refreshTokenExpiresInSeconds: 3600,
  user: { email: 'ana@example.com', id: 'user-1', name: 'Ana', role: 'ADMIN' },
};

describe('signInAgainOrReleaseSession', () => {
  it('stores the new session', async () => {
    postMock.mockImplementationOnce(async () => session);
    setSessionCookiesMock.mockClear();

    expect(await signInAgainOrReleaseSession(input)).toEqual({ status: 'signedIn' });
    expect(setSessionCookiesMock).toHaveBeenCalledTimes(1);
  });

  it('drops the old cookies and asks for a sign-in when the backend refuses or is unreachable', async () => {
    postMock.mockImplementationOnce(async () => {
      throw new Error('429');
    });
    clearSessionCookiesMock.mockClear();

    expect(await signInAgainOrReleaseSession(input)).toEqual({ status: 'signInRequired' });
    expect(clearSessionCookiesMock).toHaveBeenCalledTimes(1);
  });
});
