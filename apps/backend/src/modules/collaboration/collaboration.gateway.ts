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
  CollaborationContext,
  CollaborationGateway,
  CollaborationGatewayDependencies,
} from './types/collaboration.types';

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
      await authorizeDocument(dependencies.authorization, context, documentName, 'read');
      const state = await dependencies.persistence.load(documentName);
      return state === null ? undefined : await validateLoadedState(state);
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
    },
  });

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
    validateDocumentName: (documentName) => parsePageId(documentName),
  };
};
