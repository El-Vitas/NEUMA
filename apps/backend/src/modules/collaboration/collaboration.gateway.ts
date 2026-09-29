import { randomUUID } from 'node:crypto';
import {
  createCollaborationDocumentName,
  givePageBlocksTheirIds,
  type PageContent,
  pageContentSchema,
} from '@company-brain/shared';
import { Hocuspocus } from '@hocuspocus/server';
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs';
import {
  assertAwarenessStateSize,
  assertStateSize,
  assertUpdateSize,
  parsePageId,
  sanitizePresenceState,
} from './collaboration.utils';
import { MAX_COLLABORATION_UPDATE_BYTES } from './constants/collaboration.constants';
import type {
  CollaborationAuthorizationAdapter,
  CollaborationContentAdapter,
  CollaborationContentRewrite,
  CollaborationContext,
  CollaborationDirectConnection,
  CollaborationGateway,
  CollaborationGatewayDependencies,
} from './types/collaboration.types';
import {
  encodePageContentAsCollaborationState,
  readCollaborationDocumentContent,
  replaceCollaborationDocumentContent,
} from './utils/collaboration.document.utils';

const createForbiddenError = (): Error => new Error('forbidden');

const authorizeDocument = async (
  authorization: CollaborationAuthorizationAdapter,
  context: CollaborationContext,
  documentName: string,
  mode: 'read' | 'write',
): Promise<string> => {
  const pageId = parsePageId(documentName);
  if (context.pageId !== pageId) throw createForbiddenError();
  if (!(await authorization.authorize(context, pageId, mode))) throw createForbiddenError();
  if (mode === 'write' && context.mode !== 'write') throw createForbiddenError();
  return pageId;
};

const validateLoadedState = async (state: Uint8Array): Promise<Uint8Array> => {
  await assertStateSize(state);
  const validationDocument = new Doc();
  try {
    applyUpdate(validationDocument, state);
  } catch {
    throw new Error('malformed-state');
  } finally {
    validationDocument.destroy();
  }
  return state;
};

/**
 * El estado inicial de un documento que nadie abrió todavía: la página tal
 * como está guardada, con un id en cada bloque. Una página que ya no existe no
 * tiene documento.
 */
const seedFromStoredPage = async (content: CollaborationContentAdapter, pageId: string): Promise<Uint8Array> => {
  const stored = await content.load(pageId);
  if (stored === null) throw new Error('page-not-found');
  return encodePageContentAsCollaborationState(givePageBlocksTheirIds(stored, randomUUID));
};

/**
 * Lee, reescribe y aplica dentro de una sola transacción del documento, así
 * ningún cambio de otra persona se cuela entre lo leído y lo escrito. La página
 * nueva se valida antes de tocar nada: una transacción que falla a la mitad
 * deja escrito lo que alcanzó. Todo bloque que llegue sin id sale con uno,
 * así se lo puede señalar desde que existe.
 */
const rewriteInsideTheDocument = (
  connection: CollaborationDirectConnection,
  rewrite: CollaborationContentRewrite,
): Promise<PageContent> =>
  new Promise((resolve, reject) => {
    connection
      .transact((document) => {
        const rewritten = givePageBlocksTheirIds(
          pageContentSchema.parse(rewrite(readCollaborationDocumentContent(document))),
          randomUUID,
        );
        replaceCollaborationDocumentContent(document, rewritten);
        resolve(rewritten);
      })
      .catch(reject);
  });

export const createCollaborationGateway = (dependencies: CollaborationGatewayDependencies): CollaborationGateway => {
  const server = new Hocuspocus<CollaborationContext>({
    debounce: 250,
    maxDebounce: 2000,
    maxPendingDocuments: 10,
    maxUnauthenticatedQueueMessages: 100,
    maxUnauthenticatedQueueSize: MAX_COLLABORATION_UPDATE_BYTES,
    name: 'company-brain-collaboration',
    unloadImmediately: true,
    async onAuthenticate(payload) {
      const pageId = parsePageId(payload.documentName);
      const context = await dependencies.token.verify(payload.token);
      await authorizeDocument(dependencies.authorization, context, payload.documentName, 'read');
      payload.connectionConfig.readOnly =
        context.mode !== 'write' || !(await dependencies.authorization.authorize(context, pageId, 'write'));
      return context;
    },
    async onLoadDocument({ context, documentName }) {
      const pageId = await authorizeDocument(dependencies.authorization, context, documentName, 'read');
      const state = await dependencies.persistence.load(documentName);
      if (state !== null) return await validateLoadedState(state);
      return await seedFromStoredPage(dependencies.content, pageId);
    },
    async beforeHandleMessage({ context, documentName, update }) {
      await authorizeUpdate(context, documentName, update);
    },
    async beforeHandleAwareness({ context, documentName, states }) {
      await authorizeAwareness(context, documentName);
      await Promise.all(
        Array.from(states.keys()).map(async (clientId) => {
          const rawState = states.get(clientId);
          await assertAwarenessStateSize(rawState);
          states.set(clientId, sanitizePresenceState(rawState));
        }),
      );
    },
    async onChange({ context, documentName, update }) {
      await authorizeUpdate(context, documentName, update);
    },
    async onStoreDocument({ document, documentName, lastContext }) {
      await authorizeDocument(dependencies.authorization, lastContext, documentName, 'write');
      const state = encodeStateAsUpdate(document);
      await assertStateSize(state);
      await dependencies.persistence.store(documentName, state);
      await dependencies.content.store(lastContext, readCollaborationDocumentContent(document));
    },
  });

  const writePageContent = async (
    context: CollaborationContext,
    rewrite: CollaborationContentRewrite,
  ): Promise<PageContent> => {
    const documentName = createCollaborationDocumentName(context.pageId);
    await authorizeDocument(dependencies.authorization, context, documentName, 'write');
    const connection = await server.openDirectConnection(documentName, context);
    try {
      return await rewriteInsideTheDocument(connection, rewrite);
    } finally {
      await connection.disconnect();
    }
  };

  const readLoadedPageContent = (pageId: string): PageContent | null => {
    const document = server.documents.get(createCollaborationDocumentName(pageId));
    return document === undefined ? null : readCollaborationDocumentContent(document);
  };

  const authorizeUpdate = async (
    context: CollaborationContext,
    documentName: string,
    update: Uint8Array,
  ): Promise<void> => {
    await assertUpdateSize(update);
    await authorizeDocument(dependencies.authorization, context, documentName, 'write');
  };

  const authorizeAwareness = async (context: CollaborationContext | undefined, documentName: string): Promise<void> => {
    if (context === undefined) throw createForbiddenError();
    await authorizeDocument(dependencies.authorization, context, documentName, 'read');
  };

  return {
    assertStateSize,
    assertUpdateSize,
    authorizeUpdate,
    handleConnection: (socket, request) => server.handleConnection(socket, request),
    server,
    shutdown: () => {
      server.flushPendingStores();
      server.closeConnections();
      return Promise.resolve();
    },
    readLoadedPageContent,
    validateDocumentName: (documentName) => parsePageId(documentName),
    writePageContent,
  };
};
