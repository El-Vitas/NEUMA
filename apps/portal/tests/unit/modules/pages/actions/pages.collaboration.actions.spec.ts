import { describe, expect, it, mock } from 'bun:test';

const post = mock(async () => ({ token: 'short-lived-token' }));

mock.module('server-only', () => ({}));
mock.module('@/lib/safe-action', () => ({
  actionClient: {
    schema: () => ({
      action:
        (handler: (input: { readonly parsedInput: { readonly pageId: string } }) => Promise<unknown>) =>
        async (input: { readonly pageId: string }) => ({ data: await handler({ parsedInput: input }) }),
    }),
  },
}));
mock.module('@/shared/lib/api-server', () => ({ apiServer: { post } }));
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));

const { getPageCollaborationToken } = await import('@/modules/pages/server/actions/pages.collaboration.actions');

describe('getPageCollaborationToken', () => {
  it('requests a write-scoped page token without forwarding the access token', async () => {
    const pageId = '22222222-2222-4222-8222-222222222222';

    const result = await getPageCollaborationToken({ pageId });

    expect(post).toHaveBeenCalledWith('/api/v1/collaboration/token', { mode: 'write', pageId });
    expect(result).toEqual({ data: { token: 'short-lived-token' } });
  });
});
