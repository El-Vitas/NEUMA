import { describe, expect, test } from 'bun:test';
import { USER_ROLE } from '@company-brain/shared';
import type { Hocuspocus } from '@hocuspocus/server';
import { Doc, encodeStateAsUpdate } from 'yjs';
import { createCollaborationGateway } from '../../../../src/modules/collaboration/collaboration.gateway';
import {
  MAX_COLLABORATION_STATE_BYTES,
  MAX_COLLABORATION_UPDATE_BYTES,
} from '../../../../src/modules/collaboration/constants/collaboration.constants';
import type {
  CollaborationAuthorizationAdapter,
  CollaborationContext,
  CollaborationPersistenceAdapter,
  CollaborationTokenAdapter,
} from '../../../../src/modules/collaboration/types/collaboration.types';

const pageId = '22222222-2222-4222-8222-222222222222';
const documentName = `page:${pageId}`;

const createAdapters = (
  overrides: {
    readonly canRead?: boolean;
    readonly canWrite?: boolean;
    readonly state?: Uint8Array;
    readonly pageId?: string;
    readonly mode?: 'read' | 'write';
  } = {},
): {
  readonly authorization: CollaborationAuthorizationAdapter;
  readonly persistence: CollaborationPersistenceAdapter;
  readonly token: CollaborationTokenAdapter;
} => {
  const token: CollaborationTokenAdapter = {
    verify: (tokenValue: string): Promise<CollaborationContext> => {
      if (tokenValue !== 'valid-token') return Promise.reject(new Error('unauthorized'));
      return Promise.resolve({
        mode: overrides.mode ?? 'write',
        pageId: overrides.pageId ?? pageId,
        role: USER_ROLE.WORKER,
        userId: 'user-1',
        workspaceId: 'workspace-1',
      });
    },
  };
  const authorization: CollaborationAuthorizationAdapter = {
    authorize: (_context: CollaborationContext, requestedPageId: string, mode: 'read' | 'write') => {
      if (requestedPageId !== pageId) return Promise.resolve(false);
      return Promise.resolve(mode === 'read' ? (overrides.canRead ?? true) : (overrides.canWrite ?? true));
    },
  };
  const persistence: CollaborationPersistenceAdapter = {
    load: () => Promise.resolve(overrides.state ?? null),
    store: () => Promise.resolve(),
  };
  return { authorization, persistence, token };
};

const authenticatedPayload = (
  instance: Hocuspocus<CollaborationContext>,
  token: string,
  context: CollaborationContext = {
    mode: 'write',
    pageId,
    role: USER_ROLE.WORKER,
    userId: 'user-1',
    workspaceId: 'workspace-1',
  },
) => ({
  connectionConfig: { isAuthenticated: false, readOnly: false },
  context,
  documentName,
  instance,
  providerVersion: null,
  request: new Request('https://collaboration.test'),
  requestHeaders: new Headers(),
  requestParameters: new URLSearchParams(),
  socketId: 'socket-1',
  token,
});

describe('collaboration gateway', () => {
  test('rejects an invalid token before page authorization', () => {
    const adapters = createAdapters();
    const gateway = createCollaborationGateway(adapters);

    const authenticationResult = gateway.server.configuration.onAuthenticate?.(
      authenticatedPayload(gateway.server, 'invalid-token'),
    );
    expect(Promise.resolve(authenticationResult)).rejects.toThrow('unauthorized');
  });

  test('rejects a page that the principal cannot read', () => {
    const adapters = createAdapters({ canRead: false });
    const gateway = createCollaborationGateway(adapters);

    const authenticationResult = gateway.server.configuration.onAuthenticate?.(
      authenticatedPayload(gateway.server, 'valid-token'),
    );
    expect(Promise.resolve(authenticationResult)).rejects.toThrow('forbidden');
  });

  test('rejects a valid token scoped to a different page', () => {
    const adapters = createAdapters({ pageId: '33333333-3333-4333-8333-333333333333' });
    const gateway = createCollaborationGateway(adapters);

    expect(
      Promise.resolve(
        gateway.server.configuration.onAuthenticate?.(authenticatedPayload(gateway.server, 'valid-token')),
      ),
    ).rejects.toThrow('forbidden');
  });

  test('rejects a read-only collaboration token before write authorization', async () => {
    const adapters = createAdapters({ mode: 'read', canWrite: true });
    const gateway = createCollaborationGateway(adapters);
    const payload = authenticatedPayload(gateway.server, 'valid-token');

    const authenticatedContext = (await Promise.resolve(
      gateway.server.configuration.onAuthenticate?.(payload),
    )) as CollaborationContext;
    payload.context = authenticatedContext;

    expect(payload.connectionConfig.readOnly).toBe(true);
    expect(gateway.authorizeUpdate(payload.context, documentName, new Uint8Array([1]))).rejects.toThrow('forbidden');
  });

  test('marks a read-only viewer and rejects its document updates', async () => {
    const adapters = createAdapters({ canWrite: false });
    const gateway = createCollaborationGateway(adapters);
    const payload = authenticatedPayload(gateway.server, 'valid-token');

    await Promise.resolve(gateway.server.configuration.onAuthenticate?.(payload));
    expect(payload.connectionConfig.readOnly).toBe(true);
    expect(gateway.authorizeUpdate(payload.context, documentName, new Uint8Array([1]))).rejects.toThrow('forbidden');
  });

  test('accepts only stable page document names', () => {
    const gateway = createCollaborationGateway(createAdapters());

    expect(gateway.validateDocumentName(documentName)).toBe(pageId);
    expect(() => gateway.validateDocumentName('workspace:arbitrary')).toThrow('invalid-document-name');
    expect(() => gateway.validateDocumentName(`page:${'x'.repeat(65)}`)).toThrow('invalid-document-name');
    expect(() => gateway.validateDocumentName('page:not-a-uuid')).toThrow('invalid-document-name');
  });

  test('loads and stores bounded Yjs binary state through the adapter', async () => {
    const source = new Doc();
    source.getText('content').insert(0, 'persisted');
    const state = encodeStateAsUpdate(source);
    const stored: Uint8Array[] = [];
    const adapters = createAdapters({ state });
    const gateway = createCollaborationGateway({
      ...adapters,
      persistence: {
        load: adapters.persistence.load,
        store: (_name, storedState) => {
          stored.push(storedState);
          return Promise.resolve();
        },
      },
    });
    const loaded = await gateway.server.createDocument(
      documentName,
      new Request('https://collaboration.test'),
      'socket-1',
      { isAuthenticated: true, readOnly: false },
      { mode: 'write', pageId, role: USER_ROLE.WORKER, userId: 'user-1', workspaceId: 'workspace-1' },
    );

    expect(loaded.getText('content').toJSON()).toBe('persisted');
    await Promise.resolve(
      gateway.server.configuration.onStoreDocument?.({
        clientsCount: 1,
        document: loaded,
        documentName,
        instance: gateway.server,
        lastContext: { mode: 'write', pageId, role: USER_ROLE.WORKER, userId: 'user-1', workspaceId: 'workspace-1' },
        lastTransactionOrigin: undefined,
      }),
    );
    expect(stored).toHaveLength(1);
    expect(stored[0]).toBeInstanceOf(Uint8Array);
  });

  test('rejects malformed persisted Yjs state without exposing it to clients', () => {
    const gateway = createCollaborationGateway(createAdapters({ state: new Uint8Array([255, 255]) }));

    expect(
      gateway.server.createDocument(
        documentName,
        new Request('https://collaboration.test'),
        'socket-1',
        { isAuthenticated: true, readOnly: false },
        { mode: 'write', pageId, role: USER_ROLE.WORKER, userId: 'user-1', workspaceId: 'workspace-1' },
      ),
    ).rejects.toThrow('malformed-state');
  });

  test('rejects oversized incoming updates and oversized stored state', () => {
    const gateway = createCollaborationGateway(createAdapters());
    const oversizedUpdate = new Uint8Array(MAX_COLLABORATION_UPDATE_BYTES + 1);
    const oversizedState = new Uint8Array(MAX_COLLABORATION_STATE_BYTES + 1);

    expect(gateway.assertUpdateSize(oversizedUpdate)).rejects.toThrow('update-too-large');
    expect(gateway.assertStateSize(oversizedState)).rejects.toThrow('state-too-large');
  });

  test('flushes pending stores and closes connections during shutdown', async () => {
    const gateway = createCollaborationGateway(createAdapters());
    let flushed = false;
    gateway.server.flushPendingStores = () => {
      flushed = true;
    };
    gateway.server.closeConnections = () => {
      flushed = flushed && true;
    };

    await gateway.shutdown();
    expect(flushed).toBe(true);
  });
});
