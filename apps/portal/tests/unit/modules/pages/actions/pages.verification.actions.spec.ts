import { describe, expect, it, mock } from 'bun:test';
import type { PageSummary } from '@/modules/pages/types/pages.types';

let cookieValue: string | undefined;
const verifiedPage = {
  content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
  cover: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id: '33333333-3333-4333-8333-333333333333',
  lifecycle: 'ACTIVE',
  lockedAt: null,
  order: 0,
  owner: null,
  parentId: null,
  propertyValues: null,
  spaceId: '11111111-1111-4111-8111-111111111111',
  title: 'Untitled',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  verificationExpiresAt: new Date('2026-09-01T00:00:00.000Z'),
  verifiedAt: new Date('2026-06-01T00:00:00.000Z'),
  verifiedBy: { id: 'user-a', name: 'Ada Lovelace' },
  version: 1,
} satisfies PageSummary;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response(JSON.stringify(verifiedPage), { status: 200, headers: { 'content-type': 'application/json' } }),
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

const { setPageVerificationAction } = await import('@/modules/pages/trust/server/actions/pages.verification.actions');

const spaceId = '11111111-1111-4111-8111-111111111111';
const pageId = '22222222-2222-4222-8222-222222222222';

describe('setPageVerificationAction without an access token', () => {
  it('rejects without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await setPageVerificationAction({ pageId, spaceId, verified: true });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });
});

describe('setPageVerificationAction with an access token', () => {
  it('verifies the page with an expiration and invalidates the cache', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await setPageVerificationAction({
      expiresAt: '2026-09-01T00:00:00.000Z',
      pageId,
      spaceId,
      verified: true,
    });

    expect(result).toEqual({ data: verifiedPage });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse((requestInit as RequestInit).body as string)).toEqual({
      expiresAt: '2026-09-01T00:00:00.000Z',
      verified: true,
    });
    expect(updateTagMock).toHaveBeenCalled();
  });

  it('unverifies the page without an expiration', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    updateTagMock.mockClear();

    await setPageVerificationAction({ pageId, spaceId, verified: false });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse((requestInit as RequestInit).body as string)).toEqual({ verified: false });
  });
});

globalThis.fetch = Object.assign(fetchMock, { preconnect: (): void => undefined });
