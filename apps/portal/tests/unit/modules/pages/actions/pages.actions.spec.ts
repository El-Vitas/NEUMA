import { describe, expect, it, mock } from 'bun:test';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import { installFetchMock } from '../../../../mocks/global-fetch.mock';
import { createSafeActionMock } from '../../../../mocks/safe-action.mock';

let cookieValue: string | undefined;
const createdPage = {
  content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
  cover: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  hasOwnPermissions: false,
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
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedBy: null,
  version: 1,
} satisfies PageSummary;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response(JSON.stringify(createdPage), { status: 200, headers: { 'content-type': 'application/json' } }),
);
const updateTagMock = mock(() => undefined);

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ updateTag: updateTagMock }));
/** Listing destinations reaches the search, which caches reads with an API this module replaces. */
mock.module('@/modules/pages/server/lib/pages.destinations.server', () => ({ readPageDestinations: async () => [] }));
mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
  headers: async () => new Headers(),
}));
mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
mock.module('@/lib/safe-action', createSafeActionMock);
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));

const { addBlocksToPageAction, createPageAction, movePageAction, restorePageAction, trashPageAction } = await import(
  '@/modules/pages/server/actions/pages.actions'
);

const spaceId = '11111111-1111-4111-8111-111111111111';
const pageId = '22222222-2222-4222-8222-222222222222';

describe('pages.actions with what their schema does not accept', () => {
  it('refuses a page with no blocks at all, without making an outbound request', async () => {
    cookieValue = 'access-token';
    fetchMock.mockClear();

    const result = await createPageAction({
      content: { content: [], schemaVersion: 1, type: 'doc' },
      spaceId,
      title: 'Untitled',
    });

    expect(result).toHaveProperty('validationErrors');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('pages.actions without an access token', () => {
  it('rejects createPageAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await createPageAction({
      content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
      spaceId,
      title: 'Untitled',
    });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('rejects addBlocksToPageAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await addBlocksToPageAction({
      content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
      pageId,
      spaceId,
    });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('rejects movePageAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await movePageAction({ pageId, parentId: null, spaceId });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('rejects trashPageAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await trashPageAction({ pageId, spaceId });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('rejects restorePageAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await restorePageAction({ pageId, spaceId });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });
});

describe('createPageAction with an access token', () => {
  it('makes the outbound request and invalidates the cache', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await createPageAction({
      content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
      spaceId,
      title: 'Untitled',
    });

    expect(result).toEqual({ data: createdPage });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalled();
  });
});
installFetchMock(fetchMock);
