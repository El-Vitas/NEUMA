import { describe, expect, it, mock } from 'bun:test';
import { installFetchMock } from '../../../../mocks/global-fetch.mock';

let cookieValue: string | undefined;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
);

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ cacheLife: () => undefined, cacheTag: () => undefined }));
mock.module('next/server', () => ({ connection: async () => undefined }));
mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
}));
mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
mock.module('@/lib/logger', () => ({ logger: { error: () => undefined, info: () => undefined } }));

installFetchMock(fetchMock);

const { getPageAttachments } = await import('@/modules/pages/attachments/server/queries/pages.attachments.queries');

describe('getPageAttachments without an access token', () => {
  it('fails closed without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();

    const result = await getPageAttachments('11111111-1111-4111-8111-111111111111');

    expect(result.isFail()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getPageAttachments with an access token', () => {
  it('requests the page-scoped attachments route and returns the parsed list', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    fetchMock.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify([
            {
              id: '22222222-2222-4222-8222-222222222222',
              mimeType: 'application/pdf',
              originalFilename: 'handbook.pdf',
              size: 1024,
              uploadedBy: 'Jane Doe',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );

    const result = await getPageAttachments('11111111-1111-4111-8111-111111111111');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.getValue()).toEqual([
        {
          id: '22222222-2222-4222-8222-222222222222',
          mimeType: 'application/pdf',
          originalFilename: 'handbook.pdf',
          size: 1024,
          uploadedBy: 'Jane Doe',
        },
      ]);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl] = fetchMock.mock.calls[0] ?? [];
    expect(String(requestUrl)).toBe('https://backend.test/api/v1/files/page/11111111-1111-4111-8111-111111111111');
  });

  it('fails when the response body does not match the attachment metadata shape', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    fetchMock.mockImplementationOnce(
      async () =>
        new Response('[{"id":"not-a-uuid"}]', { status: 200, headers: { 'content-type': 'application/json' } }),
    );

    const result = await getPageAttachments('11111111-1111-4111-8111-111111111111');

    expect(result.isFail()).toBe(true);
  });
});
