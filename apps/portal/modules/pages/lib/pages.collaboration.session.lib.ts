import { COLLABORATION_DOCUMENT_FRAGMENT, createCollaborationDocumentName } from '@company-brain/shared';
import type { onStatusParameters } from '@hocuspocus/provider';
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider';
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

export const createPageCollaborationSession = (
  options: PageCollaborationSessionOptions,
): PageCollaborationSessionHandle => {
  const { callbacks, getDisplayName, pageId } = options;

  let isActive = true;
  let provider: HocuspocusProvider | null = null;
  let websocketProvider: HocuspocusProviderWebsocket | null = null;
  let attemptsMade = 0;
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Kept across reconnections: edits made while offline live here and sync on reconnect. */
  const ydoc = new Doc();
  const fragment = ydoc.getXmlFragment(COLLABORATION_DOCUMENT_FRAGMENT);

  const clearScheduledReconnect = (): void => {
    if (reconnectTimeoutId === null) return;
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  };

  const teardownConnection = (): void => {
    callbacks.onParticipantsChange([]);
    provider?.destroy();
    websocketProvider?.destroy();
    provider = null;
    websocketProvider = null;
  };

  const setAwarenessDisplayName = (targetProvider: HocuspocusProvider): void => {
    const trimmedDisplayName = getDisplayName()?.trim() ?? '';
    if (trimmedDisplayName.length === 0) return;
    targetProvider.setAwarenessField('user', { name: trimmedDisplayName });
  };

  /** One failure schedules one reconnection: the socket and the provider both report the same failure. */
  const handleConnectionFailure = (): void => {
    if (reconnectTimeoutId !== null) return;
    teardownConnection();
    if (attemptsMade >= MAX_COLLABORATION_RECONNECT_ATTEMPTS) {
      callbacks.onSessionChange(null);
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

    websocketProvider = new HocuspocusProviderWebsocket({
      maxAttempts: 1,
      url: env.NEXT_PUBLIC_COLLABORATION_WS_URL,
    });
    /**
     * The socket starts connecting on construction, and a failure there is an unhandled rejection.
     * Connecting again cancels that attempt and returns a promise this code handles.
     */
    websocketProvider.connect().catch(() => {
      if (isActive) handleConnectionFailure();
    });
    provider = new HocuspocusProvider({
      document: ydoc,
      name: createCollaborationDocumentName(pageId),
      onAuthenticationFailed: () => {
        if (isActive) handleConnectionFailure();
      },
      onAwarenessUpdate: ({ states }) => {
        if (!isActive) return;
        callbacks.onParticipantsChange(mapAwarenessStatesToParticipants(states, ydoc.clientID));
      },
      onStatus: setProviderStatus,
      /** The server seeds the document once; seeding from each browser would duplicate the page. */
      onSynced: ({ state }) => {
        if (!isActive || !state || provider === null) return;
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
      callbacks.onSessionChange(null);
      teardownConnection();
      ydoc.destroy();
    },
    updateDisplayName: (): void => {
      if (provider !== null) setAwarenessDisplayName(provider);
    },
  };
};
