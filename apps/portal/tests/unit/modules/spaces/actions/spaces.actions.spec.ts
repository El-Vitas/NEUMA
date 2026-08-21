import { describe, expect, it, mock } from 'bun:test';
import type { SpaceSummary } from '@/modules/spaces/types/spaces.types';

let cookieValue: string | undefined;
const createdSpace = {
  icon: null,
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Engineering',
  order: 0,
  ownerId: null,
  slug: 'engineering',
  visibility: 'PUBLIC_INTERNAL',
} satisfies SpaceSummary;
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response(JSON.stringify(createdSpace), { headers: { 'content-type': 'application/json' }, status: 200 }),
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

globalThis.fetch = Object.assign(fetchMock, { preconnect: (): void => undefined });

const { createSpaceAction } = await import('@/modules/spaces/server/actions/spaces.actions');

describe('createSpaceAction', () => {
  it('rejects an unauthenticated request before it reaches the backend', async () => {
    cookieValue = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await createSpaceAction({ name: 'Engineering', slug: 'engineering', visibility: 'PUBLIC_INTERNAL' });

    expect(result).toEqual({ serverError: 'Authentication is required for this action' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('creates a validated space and invalidates the spaces cache', async () => {
    cookieValue = 'valid-access-token';
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await createSpaceAction({ name: 'Engineering', slug: 'engineering', visibility: 'PUBLIC_INTERNAL' });

    expect(result).toEqual({ data: createdSpace });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalledWith('spaces');
  });
});
