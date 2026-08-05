'use client';

import type { onStatusParameters } from '@hocuspocus/provider';
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import { useEffect, useRef, useState } from 'react';
import { prosemirrorToYXmlFragment } from 'y-prosemirror';
import { Doc } from 'yjs';
import { env } from '@/config/env.config';
import { isActionSuccess } from '@/shared/lib/action-result';
import { MAX_COLLABORATION_RECONNECT_ATTEMPTS } from '../constants/pages.collaboration.constants';
import {
  computeCollaborationReconnectDelayMs,
  createCollaborationDocumentName,
  mapAwarenessStatesToParticipants,
} from '../lib/pages.collaboration.lib';
import { pageEditorSchema } from '../lib/pages.editor.schema';
import { getPageCollaborationToken } from '../server/actions/pages.collaboration.actions';
import type {
  CollaborationStatus,
  PageCollaborationParticipant,
  PageCollaborationResult,
  PageCollaborationSession,
} from '../types/pages.collaboration.types';
import type { PageContent } from '../types/pages.types';

export const usePagesCollaboration = (
  pageId: string | null,
  canEdit: boolean,
  content: PageContent,
  displayName: string | null = null,
): PageCollaborationResult => {
  const [session, setSession] = useState<PageCollaborationSession | null>(null);
  const [status, setStatus] = useState<CollaborationStatus | null>(null);
  const [participants, setParticipants] = useState<readonly PageCollaborationParticipant[]>([]);
  const initialContentRef = useRef(content);
  const displayNameRef = useRef(displayName);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  useEffect(() => {
    displayNameRef.current = displayName;
    const trimmedDisplayName = displayName?.trim() ?? '';
    if (trimmedDisplayName.length === 0) return;
    providerRef.current?.setAwarenessField('user', { name: trimmedDisplayName });
  }, [displayName]);

  useEffect(() => {
    if (pageId === null || !canEdit) return;

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
      setSession(null);
      setParticipants([]);
      provider?.destroy();
      websocketProvider?.destroy();
      ydoc?.destroy();
      provider = null;
      providerRef.current = null;
      websocketProvider = null;
      ydoc = null;
    };

    const attemptConnect = (): void => {
      attemptsMade += 1;
      if (attemptsMade === 1) setStatus('connecting');
      void connect().catch(() => {
        if (isActive) handleConnectionFailure();
      });
    };

    const handleConnectionFailure = (): void => {
      teardownSession();
      if (attemptsMade >= MAX_COLLABORATION_RECONNECT_ATTEMPTS) {
        setStatus('exhausted');
        return;
      }
      setStatus('reconnecting');
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
        setStatus('connected');
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
          setParticipants(mapAwarenessStatesToParticipants(states, ydoc.clientID));
        },
        onStatus: setProviderStatus,
        onSynced: ({ state }) => {
          if (!isActive || !state || provider === null || ydoc === null) return;
          if (fragment.length === 0) {
            prosemirrorToYXmlFragment(pageEditorSchema.nodeFromJSON(initialContentRef.current), fragment);
          }
          const trimmedDisplayName = displayNameRef.current?.trim() ?? '';
          if (trimmedDisplayName.length > 0) {
            provider.setAwarenessField('user', { name: trimmedDisplayName });
          }
          setSession({ fragment, pageId, provider, ydoc });
        },
        token: result.data.token,
        websocketProvider,
      });
      providerRef.current = provider;
      provider.attach();
    };

    attemptConnect();

    return () => {
      isActive = false;
      clearScheduledReconnect();
      teardownSession();
    };
  }, [canEdit, pageId]);

  const activeSession = session?.pageId === pageId && canEdit ? session : null;
  return {
    participants: activeSession === null ? [] : participants,
    session: activeSession,
    status: pageId !== null && canEdit ? status : null,
  };
};
