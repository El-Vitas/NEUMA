import { createCollaborationDocumentName } from '@company-brain/shared';
import type { onStatusParameters } from '@hocuspocus/provider';
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import { prosemirrorToYXmlFragment } from 'y-prosemirror';
import { Doc } from 'yjs';
import { env } from '@/config/env.config';
import { isActionSuccess } from '@/shared/lib/action-result';
import { MAX_COLLABORATION_RECONNECT_ATTEMPTS } from '../constants/pages.collaboration.constants';
import { getPageCollaborationToken } from '../server/actions/pages.collaboration.actions';
import type {
  PageCollaborationSessionHandle,
  PageCollaborationSessionOptions,
} from '../types/pages.collaboration.types';
import { computeCollaborationReconnectDelayMs, mapAwarenessStatesToParticipants } from './pages.collaboration.lib';
import { pageEditorSchema } from './pages.editor.schema';

export const createPageCollaborationSession = (
  options: PageCollaborationSessionOptions,
): PageCollaborationSessionHandle => {
  const { callbacks, getDisplayName, initialContent, pageId } = options;

  let isActive = true;
  let provider: HocuspocusProvider | null = null;
  let websocketProvider: HocuspocusProviderWebsocket | null = null;
  let ydoc: Doc | null = null;
  let attemptsMade = 0;
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const clearScheduledReconnect = (): void => {
    if (reconnectTimeoutId === null) return;
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  };

  const teardownSession = (): void => {
    callbacks.onSessionChange(null);
    callbacks.onParticipantsChange([]);
    provider?.destroy();
    websocketProvider?.destroy();
    ydoc?.destroy();
    provider = null;
    websocketProvider = null;
    ydoc = null;
  };

  const setAwarenessDisplayName = (targetProvider: HocuspocusProvider): void => {
    const trimmedDisplayName = getDisplayName()?.trim() ?? '';
    if (trimmedDisplayName.length === 0) return;
    targetProvider.setAwarenessField('user', { name: trimmedDisplayName });
  };

  const handleConnectionFailure = (): void => {
    teardownSession();
    if (attemptsMade >= MAX_COLLABORATION_RECONNECT_ATTEMPTS) {
      callbacks.onStatusChange('exhausted');
      return;
    }
    callbacks.onStatusChange('reconnecting');
    const delay = computeCollaborationReconnectDelayMs(attemptsMade);
    reconnectTimeoutId = setTimeout(() => {
      reconnectTimeoutId = null;
      attemptConnect();
    }, delay);
  };

  const setProviderStatus = ({ status: providerStatus }: onStatusParameters): void => {
    if (!isActive) return;
    if (providerStatus === 'connected') {
      attemptsMade = 0;
      callbacks.onStatusChange('connected');
      return;
    }
    if (providerStatus === 'connecting') return;
    handleConnectionFailure();
  };

  const connect = async (): Promise<void> => {
    const result = await getPageCollaborationToken({ pageId });
    if (!isActive) return;
    if (!isActionSuccess<{ readonly token: string }>(result)) {
      throw new Error('collaboration-token-request-failed');
    }

    ydoc = new Doc();
    const fragment = ydoc.getXmlFragment('prosemirror');
    websocketProvider = new HocuspocusProviderWebsocket({
      maxAttempts: 1,
      url: env.NEXT_PUBLIC_COLLABORATION_WS_URL,
    });
    provider = new HocuspocusProvider({
      document: ydoc,
      name: createCollaborationDocumentName(pageId),
      onAuthenticationFailed: () => {
        if (isActive) handleConnectionFailure();
      },
      onAwarenessUpdate: ({ states }) => {
        if (!isActive || ydoc === null) return;
        callbacks.onParticipantsChange(mapAwarenessStatesToParticipants(states, ydoc.clientID));
      },
      onStatus: setProviderStatus,
      onSynced: ({ state }) => {
        if (!isActive || !state || provider === null || ydoc === null) return;
        if (fragment.length === 0) {
          prosemirrorToYXmlFragment(pageEditorSchema.nodeFromJSON(initialContent), fragment);
        }
        setAwarenessDisplayName(provider);
        callbacks.onSessionChange({ fragment, pageId, provider, ydoc });
      },
      token: result.data.token,
      websocketProvider,
    });
    provider.attach();
  };

  const attemptConnect = (): void => {
    attemptsMade += 1;
    if (attemptsMade === 1) callbacks.onStatusChange('connecting');
    void connect().catch(() => {
      if (isActive) handleConnectionFailure();
    });
  };

  attemptConnect();

  return {
    destroy: (): void => {
      isActive = false;
      clearScheduledReconnect();
      teardownSession();
    },
    updateDisplayName: (): void => {
      if (provider !== null) setAwarenessDisplayName(provider);
    },
  };
};
