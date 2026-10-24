import { describe, expect, it, mock } from 'bun:test';
import { installFetchMock } from '../../../../mocks/global-fetch.mock';
import { createSafeActionMock } from '../../../../mocks/safe-action.mock';

const spaceId = '11111111-1111-4111-8111-111111111111';
const pageId = '22222222-2222-4222-8222-222222222222';
const paragraph = { content: [{ text: 'Hola', type: 'text' }], type: 'paragraph' };
const content = { content: [paragraph], schemaVersion: 1, type: 'doc' };

let cookieValue: string | undefined;
let answer: () => Response = () => json({});

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' }, status });

const fetchMock = mock(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => answer());
installFetchMock(fetchMock);
const updateTagMock = mock((_tag: string) => undefined);

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ updateTag: updateTagMock }));
mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
  headers: async () => new Headers(),
}));
mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
mock.module('@/lib/safe-action', createSafeActionMock);
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));

const { listPageVersionsAction, readPageVersionAction, restorePageVersionAction } = await import(
  '@/modules/pages/history/server/actions/pages.history.actions'
);

const lastRequest = (): { init: RequestInit | undefined; url: string } => {
  const [input, init] = fetchMock.mock.calls.at(-1) ?? [];
  return { init, url: String(input) };
};

describe('listing the versions of a page', () => {
  it('asks for the first page and reads the dates and the cursor', async () => {
    cookieValue = 'access-token';
    answer = () =>
      json({
        items: [
          { author: { id: 'user-a', name: 'Ana' }, createdAt: '2026-10-20T10:00:00.000Z', title: 'T', version: 3 },
        ],
        nextCursor: 3,
      });

    const result = await listPageVersionsAction({ pageId, spaceId });

    expect(lastRequest().url).toBe(`https://backend.test/api/v1/spaces/${spaceId}/pages/${pageId}/versions?limit=20`);
    expect(result?.data?.nextCursor).toBe(3);
    expect(result?.data?.items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it('sends the cursor to get the next page', async () => {
    cookieValue = 'access-token';
    answer = () => json({ items: [], nextCursor: null });

    await listPageVersionsAction({ cursor: 3, pageId, spaceId });

    expect(lastRequest().url).toEndWith('/versions?limit=20&cursor=3');
  });

  it('refuses an id that is not an id, without calling the server', async () => {
    cookieValue = 'access-token';
    fetchMock.mockClear();

    const result = await listPageVersionsAction({ pageId: '../secrets', spaceId });

    expect(result).toHaveProperty('validationErrors');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses without a session', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();

    const result = await listPageVersionsAction({ pageId, spaceId });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('reading one version', () => {
  it('returns the document of that version', async () => {
    cookieValue = 'access-token';
    answer = () => json({ content, title: 'Antes', version: 2 });

    const result = await readPageVersionAction({ pageId, spaceId, version: 2 });

    expect(lastRequest().url).toBe(`https://backend.test/api/v1/spaces/${spaceId}/pages/${pageId}/versions/2`);
    expect(result?.data?.title).toBe('Antes');
    expect(result?.data?.version).toBe(2);
    expect(result?.data?.content.content).toHaveLength(1);
  });

  it('answers missing when the version is not there', async () => {
    cookieValue = 'access-token';
    answer = () => json({ code: 'PAGE_VERSION_NOT_FOUND' }, 404);

    expect(await readPageVersionAction({ pageId, spaceId, version: 99 })).toEqual({ serverError: 'missing' });
  });
});

describe('restoring a version', () => {
  it('posts the restore and drops what the portal remembers of the pages of the space', async () => {
    cookieValue = 'access-token';
    updateTagMock.mockClear();
    answer = () => json({ id: pageId });

    const result = await restorePageVersionAction({ pageId, spaceId, version: 1 });

    expect(lastRequest().url).toBe(`https://backend.test/api/v1/spaces/${spaceId}/pages/${pageId}/versions/1/restore`);
    expect(lastRequest().init?.method).toBe('POST');
    expect(result).toEqual({ data: undefined });
    expect(updateTagMock).toHaveBeenCalledWith(`pages:${spaceId}`);
  });

  it('answers locked when the page is locked, and keeps the cache as it is', async () => {
    cookieValue = 'access-token';
    updateTagMock.mockClear();
    answer = () => json({ error: { code: 'PAGE_LOCKED', message: 'locked' } }, 409);

    expect(await restorePageVersionAction({ pageId, spaceId, version: 1 })).toEqual({ serverError: 'locked' });
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('refuses a version that is not a positive whole number', async () => {
    cookieValue = 'access-token';
    fetchMock.mockClear();

    const result = await restorePageVersionAction({ pageId, spaceId, version: 0 });

    expect(result).toHaveProperty('validationErrors');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
