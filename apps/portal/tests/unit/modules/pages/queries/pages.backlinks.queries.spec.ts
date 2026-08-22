import { describe, expect, it, mock } from 'bun:test';

let cookieValue: string | undefined;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response('{"count":0,"items":[]}', { status: 200, headers: { 'content-type': 'application/json' } }),
);

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ cacheLife: () => undefined, cacheTag: () => undefined }));
mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
}));
mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
mock.module('@/lib/logger', () => ({ logger: { error: () => undefined, info: () => undefined } }));

globalThis.fetch = Object.assign(fetchMock, { preconnect: (): void => undefined });

const { getPageBacklinks } = await import('@/modules/pages/links/server/queries/pages.backlinks.queries');

describe('getPageBacklinks without an access token', () => {
  it('fails closed without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();

    const result = await getPageBacklinks('11111111-1111-4111-8111-111111111111');

    expect(result.isFail()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getPageBacklinks with an access token', () => {
  it('requests the page-scoped backlinks route and returns the parsed result', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    fetchMock.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({
            count: 1,
            items: [
              {
                id: '22222222-2222-4222-8222-222222222222',
                spaceId: '33333333-3333-4333-8333-333333333333',
                title: 'Handbook',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );

    const result = await getPageBacklinks('11111111-1111-4111-8111-111111111111');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.getValue()).toEqual({
        count: 1,
        items: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            spaceId: '33333333-3333-4333-8333-333333333333',
            title: 'Handbook',
          },
        ],
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl] = fetchMock.mock.calls[0] ?? [];
    expect(String(requestUrl)).toBe('https://backend.test/api/v1/pages/11111111-1111-4111-8111-111111111111/backlinks');
  });

  it('fails when the response body does not match the backlinks shape', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    fetchMock.mockImplementationOnce(
      async () =>
        new Response('{"count":"not-a-number"}', { status: 200, headers: { 'content-type': 'application/json' } }),
    );

    const result = await getPageBacklinks('11111111-1111-4111-8111-111111111111');

    expect(result.isFail()).toBe(true);
  });
});
