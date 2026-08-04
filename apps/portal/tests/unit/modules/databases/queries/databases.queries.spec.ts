import { describe, expect, it, mock } from 'bun:test';

let cookieValue: string | undefined;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
);

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ cacheLife: () => undefined, cacheTag: () => undefined }));
mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
}));
mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
mock.module('@/lib/logger', () => ({ logger: { error: () => undefined, info: () => undefined } }));

globalThis.fetch = Object.assign(fetchMock, { preconnect: (): void => undefined });

const { getDatabases } = await import('@/modules/databases/server/queries/databases.queries');

describe('getDatabases without an access token', () => {
  it('fails closed without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();

    const result = await getDatabases();

    expect(result.isFail()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getDatabases with an access token', () => {
  it('makes the outbound request', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();

    const result = await getDatabases();

    expect(result.isOk()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
