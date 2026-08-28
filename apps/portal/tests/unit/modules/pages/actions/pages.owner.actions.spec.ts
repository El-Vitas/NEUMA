import { describe, expect, it, mock } from 'bun:test';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import { installFetchMock } from '../../../../mocks/global-fetch.mock';

let cookieValue: string | undefined;
const ownedPage = {
  content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
  cover: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id: '33333333-3333-4333-8333-333333333333',
  lifecycle: 'ACTIVE',
  lockedAt: null,
  order: 0,
  owner: { id: 'user-b', name: 'Grace Hopper' },
  parentId: null,
  propertyValues: null,
  spaceId: '11111111-1111-4111-8111-111111111111',
  title: 'Untitled',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedBy: null,
  version: 1,
} satisfies PageSummary;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response(JSON.stringify(ownedPage), { status: 200, headers: { 'content-type': 'application/json' } }),
);
const updateTagMock = mock(() => undefined);

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ updateTag: updateTagMock }));
mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
}));
mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
mock.module('@/lib/safe-action', () => ({
  actionClient: {
    inputSchema: () => ({
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

const { setPageOwnerAction } = await import('@/modules/pages/server/actions/pages.owner.actions');

const spaceId = '11111111-1111-4111-8111-111111111111';
const pageId = '22222222-2222-4222-8222-222222222222';

describe('setPageOwnerAction without an access token', () => {
  it('rejects without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await setPageOwnerAction({ ownerId: 'user-b', pageId, spaceId });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });
});

describe('setPageOwnerAction with an access token', () => {
  it('assigns the owner and invalidates the cache', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await setPageOwnerAction({ ownerId: 'user-b', pageId, spaceId });

    expect(result).toEqual({ data: ownedPage });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse((requestInit as RequestInit).body as string)).toEqual({ ownerId: 'user-b' });
    expect(updateTagMock).toHaveBeenCalled();
  });
});

installFetchMock(fetchMock);
