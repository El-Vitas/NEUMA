import { describe, expect, it, mock } from 'bun:test';
import { createSafeActionMock } from '../../../../../mocks/safe-action.mock';

const post = mock(async () => ({ token: 'short-lived-token' }));

mock.module('server-only', () => ({}));
mock.module('@/lib/safe-action', createSafeActionMock);
mock.module('@/shared/lib/api-server', () => ({ apiServer: { post } }));
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));

const { getBlockLiveToken } = await import('@/modules/pages/block-sync/server/actions/block-sync.actions');

describe('getBlockLiveToken', () => {
  it('asks the backend for a token to open the live channel', async () => {
    const result = await getBlockLiveToken({});

    expect(post).toHaveBeenCalledWith('/api/v1/blocks/live/token', {});
    expect(result).toEqual({ data: { token: 'short-lived-token' } });
  });
});
