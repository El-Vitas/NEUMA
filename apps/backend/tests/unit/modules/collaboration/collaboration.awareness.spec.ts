import { describe, expect, test } from 'bun:test';
import { USER_ROLE } from '@company-brain/shared';
import type { Hocuspocus } from '@hocuspocus/server';
import { createCollaborationGateway } from '../../../../src/modules/collaboration/collaboration.gateway';
import { MAX_COLLABORATION_AWARENESS_STATE_BYTES } from '../../../../src/modules/collaboration/constants/collaboration.constants';
import type {
  CollaborationAuthorizationAdapter,
  CollaborationContentAdapter,
  CollaborationContext,
  CollaborationPersistenceAdapter,
  CollaborationTokenAdapter,
} from '../../../../src/modules/collaboration/types/collaboration.types';

const pageId = '22222222-2222-4222-8222-222222222222';
const documentName = `page:${pageId}`;

const createAdapters = (
  overrides: {
    readonly canRead?: boolean;
    readonly storeCalls?: Array<{ readonly documentName: string; readonly state: Uint8Array }>;
  } = {},
): {
  readonly authorization: CollaborationAuthorizationAdapter;
  readonly content: CollaborationContentAdapter;
  readonly persistence: CollaborationPersistenceAdapter;
  readonly token: CollaborationTokenAdapter;
} => {
  const authorization: CollaborationAuthorizationAdapter = {
    authorize: (_context: CollaborationContext, requestedPageId: string, mode: 'read' | 'write') => {
      if (requestedPageId !== pageId) return Promise.resolve(false);
      return Promise.resolve(mode === 'read' ? (overrides.canRead ?? true) : true);
    },
  };
  const persistence: CollaborationPersistenceAdapter = {
    load: () => Promise.resolve(null),
    store: (name, state) => {
      overrides.storeCalls?.push({ documentName: name, state });
      return Promise.resolve();
    },
  };
  const token: CollaborationTokenAdapter = {
    verify: () => Promise.reject(new Error('unused')),
  };
  const content: CollaborationContentAdapter = {
    load: () => Promise.resolve({ content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' }),
    store: () => Promise.resolve(),
  };
  return { authorization, content, persistence, token };
};

const buildContext = (overrides: Partial<CollaborationContext> = {}): CollaborationContext => ({
  mode: 'write',
  pageId,
  role: USER_ROLE.WORKER,
  userId: 'user-1',
  workspaceId: 'workspace-1',
  ...overrides,
});

const createAwarenessDocument = async (gateway: { readonly server: Hocuspocus<CollaborationContext> }) =>
  gateway.server.createDocument(
    documentName,
    new Request('https://collaboration.test'),
    'socket-1',
    { isAuthenticated: true, readOnly: false },
    buildContext(),
  );

const invokeBeforeHandleAwareness = (
  gateway: { readonly server: Hocuspocus<CollaborationContext> },
  document: Awaited<ReturnType<typeof createAwarenessDocument>>,
  states: Map<number, Record<string, unknown>>,
  context: CollaborationContext | undefined,
): unknown =>
  gateway.server.configuration.beforeHandleAwareness?.({
    awareness: document.awareness,
    clientsCount: 1,
    context,
    document,
    documentName,
    instance: gateway.server,
    requestHeaders: new Headers(),
    requestParameters: new URLSearchParams(),
    socketId: 'socket-1',
    states,
    transactionOrigin: undefined,
  });

const createDefaultAwarenessFixture = async (): Promise<{
  readonly document: Awaited<ReturnType<typeof createAwarenessDocument>>;
  readonly gateway: { readonly server: Hocuspocus<CollaborationContext> };
  readonly states: Map<number, Record<string, unknown>>;
}> => {
  const gateway = createCollaborationGateway(createAdapters());
  const document = await createAwarenessDocument(gateway);
  const states = new Map<number, Record<string, unknown>>([[1, { user: { name: 'Alice' } }]]);
  return { document, gateway, states };
};

describe('collaboration gateway awareness', () => {
  test('rejects an awareness update from a context scoped to a different page', async () => {
    const { gateway, document, states } = await createDefaultAwarenessFixture();

    const result = invokeBeforeHandleAwareness(
      gateway,
      document,
      states,
      buildContext({ pageId: '33333333-3333-4333-8333-333333333333' }),
    );

    expect(Promise.resolve(result)).rejects.toThrow('forbidden');
  });

  test('rejects an awareness update without an authenticated context', async () => {
    const { gateway, document, states } = await createDefaultAwarenessFixture();

    const result = invokeBeforeHandleAwareness(gateway, document, states, undefined);

    expect(Promise.resolve(result)).rejects.toThrow('forbidden');
  });

  test('rejects an awareness update the principal cannot read', async () => {
    const permissiveGateway = createCollaborationGateway(createAdapters());
    const document = await createAwarenessDocument(permissiveGateway);
    const gateway = createCollaborationGateway(createAdapters({ canRead: false }));
    const states = new Map<number, Record<string, unknown>>([[1, { user: { name: 'Alice' } }]]);

    const result = invokeBeforeHandleAwareness(gateway, document, states, buildContext());

    expect(Promise.resolve(result)).rejects.toThrow('forbidden');
  });

  test('rejects an oversized awareness payload', async () => {
    const gateway = createCollaborationGateway(createAdapters());
    const document = await createAwarenessDocument(gateway);
    const oversizedNote = 'x'.repeat(MAX_COLLABORATION_AWARENESS_STATE_BYTES + 1);
    const states = new Map<number, Record<string, unknown>>([[1, { user: { name: 'Alice' }, note: oversizedNote }]]);

    const result = invokeBeforeHandleAwareness(gateway, document, states, buildContext());

    expect(Promise.resolve(result)).rejects.toThrow('awareness-payload-too-large');
  });

  test('strips sensitive fields and keeps only the safe presence shape', async () => {
    const gateway = createCollaborationGateway(createAdapters());
    const document = await createAwarenessDocument(gateway);
    const states = new Map<number, Record<string, unknown>>([
      [
        1,
        {
          cursor: {
            anchor: { type: null, tname: null, item: null, assoc: 0 },
            head: { type: null, tname: null, item: null, assoc: 0 },
          },
          email: 'alice@example.com',
          token: 'super-secret',
          user: { color: '#ff00aa', name: 'Alice', email: 'alice@example.com', role: 'ADMIN' },
        },
      ],
    ]);

    await invokeBeforeHandleAwareness(gateway, document, states, buildContext());

    expect(states.get(1)).toEqual({
      cursor: {
        anchor: { type: null, tname: null, item: null, assoc: 0 },
        head: { type: null, tname: null, item: null, assoc: 0 },
      },
      user: { color: '#ff00aa', name: 'Alice' },
    });
  });

  test('drops an unsafe user color and falls back to no color', async () => {
    const gateway = createCollaborationGateway(createAdapters());
    const document = await createAwarenessDocument(gateway);
    const states = new Map<number, Record<string, unknown>>([
      [1, { cursor: null, user: { color: 'javascript:alert(1)', name: 'Alice' } }],
    ]);

    await invokeBeforeHandleAwareness(gateway, document, states, buildContext());

    expect(states.get(1)).toEqual({ cursor: null, user: { color: null, name: 'Alice' } });
  });

  test('never persists presence state through the document persistence adapter', async () => {
    const storeCalls: Array<{ readonly documentName: string; readonly state: Uint8Array }> = [];
    const gateway = createCollaborationGateway(createAdapters({ storeCalls }));
    const document = await createAwarenessDocument(gateway);
    const states = new Map<number, Record<string, unknown>>([[1, { cursor: null, user: { name: 'Alice' } }]]);

    await invokeBeforeHandleAwareness(gateway, document, states, buildContext());

    expect(storeCalls).toHaveLength(0);
  });
});
