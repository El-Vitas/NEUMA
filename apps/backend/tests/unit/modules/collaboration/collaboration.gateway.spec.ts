import { describe, expect, test } from 'bun:test';
import { type PageContent, USER_ROLE } from '@company-brain/shared';
import type { Hocuspocus } from '@hocuspocus/server';
import { createCollaborationGateway } from '../../../../src/modules/collaboration/collaboration.gateway';
import {
  MAX_COLLABORATION_STATE_BYTES,
  MAX_COLLABORATION_UPDATE_BYTES,
} from '../../../../src/modules/collaboration/constants/collaboration.constants';
import type {
  CollaborationAuthorizationAdapter,
  CollaborationContentAdapter,
  CollaborationContext,
  CollaborationGateway as CollaborationGatewayContract,
  CollaborationPersistenceAdapter,
  CollaborationTokenAdapter,
} from '../../../../src/modules/collaboration/types/collaboration.types';
import {
  encodePageContentAsCollaborationState,
  readCollaborationDocumentContent,
} from '../../../../src/modules/collaboration/utils/collaboration.document.utils';

const pageId = '22222222-2222-4222-8222-222222222222';
const documentName = `page:${pageId}`;

const writerContext: CollaborationContext = {
  mode: 'write',
  pageId,
  role: USER_ROLE.WORKER,
  userId: 'user-1',
  workspaceId: 'workspace-1',
};

const paragraph = (id: string, text: string): PageContent['content'][number] => ({
  attrs: { id },
  content: [{ text, type: 'text' }],
  type: 'paragraph',
});

const pageOf = (...blocks: PageContent['content']): PageContent => ({ content: blocks, schemaVersion: 1, type: 'doc' });

const storedPage = pageOf(paragraph('a', 'Lo guardado'));

/** Una página admite hasta 20.000 caracteres por texto; uno más ya no calza. */
const textBeyondThePageLimit = 20_001;

const createAdapters = (
  overrides: {
    readonly canRead?: boolean;
    readonly canWrite?: boolean;
    readonly state?: Uint8Array;
    readonly pageId?: string;
    readonly mode?: 'read' | 'write';
    readonly content?: PageContent | null;
  } = {},
): {
  readonly authorization: CollaborationAuthorizationAdapter;
  readonly content: CollaborationContentAdapter;
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
  const content: CollaborationContentAdapter = {
    load: () => Promise.resolve(overrides.content === undefined ? storedPage : overrides.content),
    store: () => Promise.resolve(),
  };
  return { authorization, content, persistence, token };
};

const openDocument = (gateway: CollaborationGatewayContract) =>
  gateway.server.createDocument(
    documentName,
    new Request('https://collaboration.test'),
    'socket-1',
    { isAuthenticated: true, readOnly: false },
    writerContext,
  );

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

  /**
   * Toda conexión manda mensajes aunque no escriba: el primero pide el estado
   * del documento. A quien solo lee se le pide poder leer, no escribir; lo que
   * intente cambiar ya lo descarta la conexión de solo lectura.
   */
  test('lets a read-only viewer sync the document, asking it only to be able to read', async () => {
    const adapters = createAdapters({ canWrite: false, mode: 'read' });
    const gateway = createCollaborationGateway(adapters);
    const payload = authenticatedPayload(gateway.server, 'valid-token');
    payload.context = (await Promise.resolve(
      gateway.server.configuration.onAuthenticate?.(payload),
    )) as CollaborationContext;

    const handled = gateway.authorizeMessage(payload.context, documentName, new Uint8Array([0]), { readOnly: true });

    expect(handled).resolves.toBeUndefined();
  });

  test('still asks a connection that writes to be able to write, message by message', () => {
    const adapters = createAdapters({ canWrite: false });
    const gateway = createCollaborationGateway(adapters);
    const context: CollaborationContext = {
      mode: 'write',
      pageId,
      role: USER_ROLE.WORKER,
      userId: 'user-1',
      workspaceId: 'workspace-1',
    };

    const handled = gateway.authorizeMessage(context, documentName, new Uint8Array([0]), { readOnly: false });

    expect(handled).rejects.toThrow('forbidden');
  });

  test('accepts only stable page document names', () => {
    const gateway = createCollaborationGateway(createAdapters());

    expect(gateway.validateDocumentName(documentName)).toBe(pageId);
    expect(() => gateway.validateDocumentName('workspace:arbitrary')).toThrow('invalid-document-name');
    expect(() => gateway.validateDocumentName(`page:${'x'.repeat(65)}`)).toThrow('invalid-document-name');
    expect(() => gateway.validateDocumentName('page:not-a-uuid')).toThrow('invalid-document-name');
  });

  /** Las páginas nacen con UUID v7: un patrón que solo conoce hasta la v5 deja fuera a todas. */
  test('accepts the document of a page whose id is a version 7 uuid', () => {
    const gateway = createCollaborationGateway(createAdapters());
    const versionSevenPageId = '019ffc24-f641-739d-bc50-284c896476fc';

    expect(gateway.validateDocumentName(`page:${versionSevenPageId}`)).toBe(versionSevenPageId);
  });

  test('loads the stored state, and stores the state together with the page it now says', async () => {
    const live = pageOf(paragraph('a', 'Lo que quedó en vivo'));
    const storedStates: Uint8Array[] = [];
    const storedPages: PageContent[] = [];
    const adapters = createAdapters({ state: encodePageContentAsCollaborationState(live) });
    const gateway = createCollaborationGateway({
      ...adapters,
      content: {
        load: adapters.content.load,
        store: (_context, content) => {
          storedPages.push(content);
          return Promise.resolve();
        },
      },
      persistence: {
        load: adapters.persistence.load,
        store: (_name, storedState) => {
          storedStates.push(storedState);
          return Promise.resolve();
        },
      },
    });
    const loaded = await openDocument(gateway);

    expect(readCollaborationDocumentContent(loaded)).toEqual(live);
    await Promise.resolve(
      gateway.server.configuration.onStoreDocument?.({
        clientsCount: 1,
        document: loaded,
        documentName,
        instance: gateway.server,
        lastContext: writerContext,
        lastTransactionOrigin: undefined,
      }),
    );
    expect(storedStates).toHaveLength(1);
    expect(storedPages).toEqual([live]);
  });

  /**
   * Sembrar es cosa del servidor, una vez por documento. Si lo hiciera cada
   * navegador al encontrarlo vacío, dos que abren a la vez lo escribirían dos
   * veces.
   */
  test('seeds a document nobody has opened yet with the stored page', async () => {
    const gateway = createCollaborationGateway(createAdapters());

    expect(readCollaborationDocumentContent(await openDocument(gateway))).toEqual(storedPage);
  });

  test('keeps the live state over the stored page when both exist', async () => {
    const live = pageOf(paragraph('a', 'En vivo'));
    const gateway = createCollaborationGateway(
      createAdapters({ content: storedPage, state: encodePageContentAsCollaborationState(live) }),
    );

    expect(readCollaborationDocumentContent(await openDocument(gateway))).toEqual(live);
  });

  test('refuses to open the document of a page that no longer exists', () => {
    const gateway = createCollaborationGateway(createAdapters({ content: null }));

    expect(openDocument(gateway)).rejects.toThrow('page-not-found');
  });
});

describe('collaboration gateway writing from the server', () => {
  test('rewrites the page from what it says now, and stores the result', async () => {
    const storedPages: PageContent[] = [];
    const adapters = createAdapters();
    const gateway = createCollaborationGateway({
      ...adapters,
      content: {
        load: adapters.content.load,
        store: (_context, content) => {
          storedPages.push(content);
          return Promise.resolve();
        },
      },
    });

    const written = await gateway.writePageContent(writerContext, (current) =>
      pageOf(...current.content, paragraph('b', 'Agregado')),
    );

    const expected = pageOf(paragraph('a', 'Lo guardado'), paragraph('b', 'Agregado'));
    expect(written).toEqual(expected);
    expect(storedPages.at(-1)).toEqual(expected);
  });

  test('reaches a person who has the page open, live', async () => {
    const gateway = createCollaborationGateway(createAdapters());
    const connection = await gateway.server.openDirectConnection(documentName, writerContext);

    await gateway.writePageContent(writerContext, (current) => pageOf(...current.content, paragraph('b', 'En vivo')));

    const openDocumentState = connection.document;
    if (openDocumentState === null) throw new Error('the open document went away');
    expect(readCollaborationDocumentContent(openDocumentState).content).toHaveLength(2);
    await connection.disconnect();
  });

  test('refuses to write for someone who may not write in the page', () => {
    const gateway = createCollaborationGateway(createAdapters({ canWrite: false }));

    expect(gateway.writePageContent(writerContext, (current) => current)).rejects.toThrow('forbidden');
  });

  /** Una transacción que falla a la mitad deja escrito lo que alcanzó: lo inválido no llega a tocar el documento. */
  test('leaves the document untouched when the new page does not fit the page shape', async () => {
    const gateway = createCollaborationGateway(createAdapters());
    const tooLong = pageOf(paragraph('a', 'x'.repeat(textBeyondThePageLimit)));

    expect(gateway.writePageContent(writerContext, () => tooLong)).rejects.toThrow();
    const connection = await gateway.server.openDirectConnection(documentName, writerContext);
    const document = connection.document;
    if (document === null) throw new Error('the document went away');
    expect(readCollaborationDocumentContent(document)).toEqual(storedPage);
    await connection.disconnect();
  });
});

describe('collaboration gateway limits', () => {
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
