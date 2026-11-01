import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ApiError } from '@/shared/lib/api';
import { createSafeActionMock } from '../../../../mocks/safe-action.mock';

interface Call {
  readonly body: unknown;
  readonly method: string;
  readonly url: string;
}

const calls: Call[] = [];
let failSchema = false;

const authenticatedRequest = mock(async (url: string, method: string, body: unknown): Promise<unknown> => {
  calls.push({ body, method, url });
  if (url.endsWith('/schema') && failSchema) throw new ApiError(422, 'invalid shape');
  return {
    canEdit: true,
    content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
    cover: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: null,
    hasOwnPermissions: false,
    id: '0b9c9d2e-5d1a-4f10-9a7c-3a3c5b7a1f00',
    lifecycle: 'ACTIVE',
    lockedAt: null,
    order: 1,
    owner: null,
    parentId: null,
    propertyValues: null,
    spaceId: 'space-1',
    title: 'Tasks',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: null,
    verificationExpiresAt: null,
    verifiedAt: null,
    verifiedBy: null,
    version: 1,
  };
});

mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({
  cacheLife: () => undefined,
  cacheTag: () => undefined,
  updateTag: () => undefined,
}));
mock.module('@/shared/server/lib/authenticated-request.server', () => ({ authenticatedRequest }));
mock.module('@/shared/server/lib/time-zone.server', () => ({ readRequestTimeZone: async () => null }));
mock.module('@/lib/logger', () => ({ logger: { error: () => undefined, info: () => undefined } }));
mock.module('@/lib/safe-action', createSafeActionMock);
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));

const { createPageCollectionAction } = await import(
  '@/modules/pages/collections/server/actions/pages.collections.actions'
);

const input = {
  content: { content: [{ content: [], type: 'paragraph' as const }], schemaVersion: 1 as const, type: 'doc' as const },
  id: '0b9c9d2e-5d1a-4f10-9a7c-3a3c5b7a1f00',
  properties: [{ key: 'notes', label: 'Notes', options: null, required: false, type: 'RICH_TEXT' as const }],
  spaceId: 'space-1',
  title: 'Tasks',
  views: [{ configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' as const }],
};

describe('createPageCollectionAction', () => {
  beforeEach(() => {
    calls.length = 0;
    failSchema = false;
  });

  it('creates the page with the id the caller chose, so a retry makes it once', async () => {
    await createPageCollectionAction(input);

    expect(calls[0]).toMatchObject({ body: { id: input.id } });
  });

  it('puts the page in the trash when its shape is refused, instead of leaving an ordinary empty page', async () => {
    failSchema = true;

    const result = await createPageCollectionAction(input);

    expect(result).toEqual({ serverError: 'invalid' });
    expect(calls.map((call) => call.url.split('/').slice(-1)[0])).toEqual([
      'pages?includeTrashed=false',
      'schema',
      'trash',
    ]);
  });
});
