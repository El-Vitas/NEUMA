import { describe, expect, it, mock } from 'bun:test';

let cookieValue: string | undefined;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
);
const updateTagMock = mock(() => undefined);

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ updateTag: updateTagMock }));
mock.module('next/headers', () => ({
  cookies: async () => ({
    get: () => (cookieValue === undefined ? undefined : { value: cookieValue }),
    delete: () => undefined,
  }),
}));
mock.module('next-intl/server', () => ({ getLocale: async () => 'en' }));
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

globalThis.fetch = Object.assign(fetchMock, { preconnect: (): void => undefined });

const { createDatabaseAction, createDatabaseRecordAction, updateDatabaseRecordAction } = await import(
  '@/modules/databases/server/actions/databases.actions'
);

const databaseId = '33333333-3333-4333-8333-333333333333';

describe('databases.actions without an access token', () => {
  it('rejects createDatabaseAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await createDatabaseAction({ name: 'Tasks', slug: 'tasks', spaceId: databaseId, template: 'TASKS' });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('rejects createDatabaseRecordAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await createDatabaseRecordAction({ databaseId, propertyValues: {}, title: 'Untitled' });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('rejects updateDatabaseRecordAction without making an outbound request', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await updateDatabaseRecordAction({
      databaseId,
      propertyValues: {},
      recordId: databaseId,
      title: 'Untitled',
    });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });
});

describe('createDatabaseAction with an access token', () => {
  it('makes the outbound request and invalidates the cache', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await createDatabaseAction({ name: 'Tasks', slug: 'tasks', spaceId: databaseId, template: 'TASKS' });

    expect(result).toEqual({ data: undefined });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalledWith('databases');
  });
});
