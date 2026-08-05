import { describe, expect, it, mock } from 'bun:test';
import type { PageSummary } from '@/modules/pages/types/pages.types';

let cookieValue: string | undefined;
const createdPage = {
  content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
  id: '33333333-3333-4333-8333-333333333333',
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  propertyValues: null,
  spaceId: '11111111-1111-4111-8111-111111111111',
  title: 'Untitled',
  version: 1,
} satisfies PageSummary;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response(JSON.stringify(createdPage), { status: 200, headers: { 'content-type': 'application/json' } }),
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
    schema: () => ({
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

const { createPageAction, movePageAction, restorePageAction, trashPageAction, updatePageAction } = await import(
  '@/modules/pages/server/actions/pages.actions'
);

const spaceId = '11111111-1111-4111-8111-111111111111';
const pageId = '22222222-2222-4222-8222-222222222222';

describe('pages.actions without an access token', () => {
  it('rejects createPageAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await createPageAction({
      content: { content: [], schemaVersion: 1, type: 'doc' },
      spaceId,
      title: 'Untitled',
    });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('rejects updatePageAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await updatePageAction({
      content: { content: [], schemaVersion: 1, type: 'doc' },
      pageId,
      spaceId,
      title: 'Untitled',
    });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('rejects movePageAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await movePageAction({ pageId, parentId: null, spaceId });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('rejects trashPageAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await trashPageAction({ pageId, spaceId });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('rejects restorePageAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await restorePageAction({ pageId, spaceId });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
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
      content: { content: [], schemaVersion: 1, type: 'doc' },
      spaceId,
      title: 'Untitled',
    });

    expect(result).toEqual({ data: createdPage });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalled();
  });
});
globalThis.fetch = Object.assign(fetchMock, { preconnect: (): void => undefined });
