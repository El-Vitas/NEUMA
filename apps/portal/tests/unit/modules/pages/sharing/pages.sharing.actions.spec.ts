import { describe, expect, it, mock } from 'bun:test';
import { installFetchMock } from '../../../../mocks/global-fetch.mock';
import { createSafeActionMock } from '../../../../mocks/safe-action.mock';

let cookieValue: string | undefined;
let responseStatus = 200;
let responseBody: unknown = {};
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response(JSON.stringify(responseBody), {
      headers: { 'content-type': 'application/json' },
      status: responseStatus,
    }),
);
const updateTagMock = mock(() => undefined);

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

const { getBlockAccessAction, setBlockPermissionsAction } = await import(
  '@/modules/pages/sharing/server/actions/pages.sharing.actions'
);

const blockId = '22222222-2222-4222-8222-222222222222';
const spaceId = '11111111-1111-4111-8111-111111111111';
const adminEntry = { principal: { kind: 'user', userId: 'admin' }, role: 'full', user: null } as const;
const access = {
  blockId,
  entries: [adminEntry],
  inherited: { entries: [], source: null },
  isDeclaredHere: true,
  members: [],
  source: { id: blockId, title: 'Roadmap', type: 'page' },
  spaceId,
  viewerId: 'admin',
};

const reset = (status: number, body: unknown): void => {
  cookieValue = 'valid-access-token';
  responseStatus = status;
  responseBody = body;
  fetchMock.mockClear();
  updateTagMock.mockClear();
};

describe('getBlockAccessAction', () => {
  it('rejects without a session and without calling the backend', async () => {
    reset(200, access);
    cookieValue = undefined;

    const result = await getBlockAccessAction({ blockId });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads who has access to the block', async () => {
    reset(200, access);

    const result = await getBlockAccessAction({ blockId });

    expect(result).toEqual({ data: access });
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(`https://backend.test/api/v1/blocks/${blockId}/access`);
  });

  it('says forbidden when the backend refuses', async () => {
    reset(403, { error: { code: 'BLOCK_PERMISSIONS_FORBIDDEN', message: 'No' } });

    expect(await getBlockAccessAction({ blockId })).toEqual({ serverError: 'forbidden' });
  });
});

describe('setBlockPermissionsAction', () => {
  const permissions = [{ principal: { kind: 'user', userId: 'admin' }, role: 'full' }] as const;

  it('sends one setPermission transaction for the block and refreshes the page list', async () => {
    reset(200, { transactions: [{ id: 'sent' }] });

    const result = await setBlockPermissionsAction({ blockId, permissions: [...permissions], spaceId });

    expect(result).toEqual({ data: { blockId } });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://backend.test/api/v1/transactions');
    const body = JSON.parse(String((init as RequestInit).body)) as {
      transactions: { operations: unknown[]; spaceId: string }[];
    };
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0]?.spaceId).toBe(spaceId);
    expect(body.transactions[0]?.operations).toEqual([
      { args: { permissions }, command: 'setPermission', path: [], pointer: { id: blockId, table: 'block' } },
    ]);
    expect(updateTagMock).toHaveBeenCalled();
  });

  it('sends null to make the block follow what is above it again', async () => {
    reset(200, { transactions: [{ id: 'sent' }] });

    await setBlockPermissionsAction({ blockId, permissions: null, spaceId });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String((init as RequestInit).body)) as {
      transactions: { operations: { args: unknown }[] }[];
    };
    expect(body.transactions[0]?.operations[0]?.args).toEqual({ permissions: null });
  });

  it('reports a refusal inside the transaction as forbidden, not as a success', async () => {
    reset(200, { transactions: [{ error: { code: 'BLOCK_PERMISSIONS_FORBIDDEN', message: 'No' }, id: 'sent' }] });

    const result = await setBlockPermissionsAction({ blockId, permissions: null, spaceId });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('reports a refusal because nobody would keep full access as a conflict', async () => {
    reset(200, { transactions: [{ error: { code: 'BLOCK_PERMISSIONS_LOCKOUT', message: 'No' }, id: 'sent' }] });

    const result = await setBlockPermissionsAction({ blockId, permissions: [], spaceId });

    expect(result).toEqual({ serverError: 'conflict' });
  });

  it('rejects a declaration that names the same person twice before calling the backend', async () => {
    reset(200, { transactions: [{ id: 'sent' }] });
    const twice = [...permissions, ...permissions];

    const result = await setBlockPermissionsAction({ blockId, permissions: twice, spaceId });

    expect(result).toHaveProperty('validationErrors');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

installFetchMock(fetchMock);
