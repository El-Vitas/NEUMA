import { createCollaborationDocumentName } from '@company-brain/shared';
import type { onStatusParameters } from '@hocuspocus/provider';
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import { prosemirrorToYXmlFragment } from 'y-prosemirror';
import { Doc } from 'yjs';
import { env } from '@/config/env.config';
import { isActionSuccess } from '@/shared/lib/action-result';
import { MAX_COLLABORATION_RECONNECT_ATTEMPTS } from '../constants/pages.collaboration.constants';
import { pageEditorSchema } from '../editor/lib/pages.editor.schema';
import { getPageCollaborationToken } from '../server/actions/pages.collaboration.actions';
import type {
  PageCollaborationSessionHandle,
  PageCollaborationSessionOptions,
} from '../types/pages.collaboration.types';
import { computeCollaborationReconnectDelayMs, mapAwarenessStatesToParticipants } from './pages.collaboration.lib';

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

  /**
   * One failure, one reconnection.
   *
   * The same failure is heard from twice — the socket refuses, and the provider
   * reports the disconnection — and each account used to become a reconnection
   * of its own: two sessions racing, two timers running, and the attempts spent
   * twice as fast as the reader was told.
   */
  const handleConnectionFailure = (): void => {
    if (reconnectTimeoutId !== null) return;
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
    /**
     * The socket is asked to connect here so that its refusal belongs to us.
     *
     * It starts connecting on its own the moment it is built, and a connection
     * that fails ends as a rejection nobody is waiting for — which the browser
     * then reports as a fault in the middle of writing, over something as
     * ordinary as a page opened while the server is restarting. Asking again
     * calls off that first attempt and hands us the answer to the second.
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
