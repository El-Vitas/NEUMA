import { describe, expect, it, mock } from 'bun:test';
import { installFetchMock } from '../../../../mocks/global-fetch.mock';
import { createSafeActionMock } from '../../../../mocks/safe-action.mock';

let cookieValue: string | undefined;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response('{"token":"short-lived-token"}', { status: 200, headers: { 'content-type': 'application/json' } }),
);

mock.module('server-only', () => ({}));
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

installFetchMock(fetchMock);

const { getPageCollaborationToken } = await import('@/modules/pages/server/actions/pages.collaboration.actions');

describe('getPageCollaborationToken without an access token', () => {
  it('rejects without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();

    const result = await getPageCollaborationToken({ pageId: '22222222-2222-4222-8222-222222222222' });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getPageCollaborationToken with an access token', () => {
  it('requests a write-scoped token', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();

    const result = await getPageCollaborationToken({ pageId: '22222222-2222-4222-8222-222222222222' });

    expect(result).toEqual({ data: { token: 'short-lived-token' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
