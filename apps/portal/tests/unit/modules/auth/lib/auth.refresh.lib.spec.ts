import { describe, expect, it, mock } from 'bun:test';
import { installFetchMock } from '../../../../mocks/global-fetch.mock';

const session = {
  accessToken: 'new-access',
  accessTokenExpiresInSeconds: 900,
  refreshToken: 'new-refresh',
  refreshTokenExpiresInSeconds: 3600,
  user: { email: 'ana@example.com', id: 'user-1', name: 'Ana', role: 'ADMIN' as const },
};

const answerWith = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' }, status });

let nextAnswer: () => Promise<Response> = async () => answerWith(200, session);
let lastRequestInit: RequestInit | undefined;
const fetchMock = mock(async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  lastRequestInit = init;
  return nextAnswer();
});

mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
installFetchMock(fetchMock);

const { refreshSession } = await import('@/modules/auth/lib/auth.refresh.lib');

describe('refreshSession', () => {
  it('renews the session and tells the backend which person is asking', async () => {
    nextAnswer = async () => answerWith(200, session);
    fetchMock.mockClear();

    const outcome = await refreshSession('refresh-a', '203.0.113.7');

    expect(outcome).toEqual({ session, status: 'renewed' });
    expect(new Headers(lastRequestInit?.headers).get('x-forwarded-for')).toBe('203.0.113.7');
  });

  it('reports a rejected token as rejected', async () => {
    nextAnswer = async () => answerWith(401);

    expect(await refreshSession('refresh-b', undefined)).toEqual({ status: 'rejected' });
  });

  it('does not treat throttling or a backend failure as a rejected session', async () => {
    nextAnswer = async () => answerWith(429);
    expect(await refreshSession('refresh-c', undefined)).toEqual({ status: 'unavailable' });

    nextAnswer = async () => answerWith(503);
    expect(await refreshSession('refresh-d', undefined)).toEqual({ status: 'unavailable' });
  });

  it('does not treat an unreachable backend as a rejected session', async () => {
    nextAnswer = async () => {
      throw new TypeError('fetch failed');
    };

    expect(await refreshSession('refresh-e', undefined)).toEqual({ status: 'unavailable' });
  });

  it('asks the backend once when the same token is refreshed in parallel', async () => {
    let release: (answer: Response) => void = () => undefined;
    nextAnswer = () => new Promise<Response>((resolve) => (release = resolve));
    fetchMock.mockClear();

    const first = refreshSession('refresh-f', undefined);
    const second = refreshSession('refresh-f', undefined);
    release(answerWith(200, session));

    expect(await first).toEqual({ session, status: 'renewed' });
    expect(await second).toEqual({ session, status: 'renewed' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
