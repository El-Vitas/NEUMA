'use client';

import type { onStatusParameters } from '@hocuspocus/provider';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useEffect, useRef, useState } from 'react';
import { prosemirrorToYXmlFragment } from 'y-prosemirror';
import { Doc } from 'yjs';
import { env } from '@/config/env.config';
import { isActionSuccess } from '@/shared/lib/action-result';
import { createCollaborationDocumentName, createCollaborationWebSocketUrl } from '../lib/pages.collaboration.lib';
import { pageEditorSchema } from '../lib/pages.editor.schema';
import { getPageCollaborationToken } from '../server/actions/pages.collaboration.actions';
import type {
  CollaborationStatus,
  PageCollaborationResult,
  PageCollaborationSession,
} from '../types/pages.collaboration.types';
import type { PageContent } from '../types/pages.types';

export const usePagesCollaboration = (
  pageId: string | null,
  canEdit: boolean,
  content: PageContent,
): PageCollaborationResult => {
  const [session, setSession] = useState<PageCollaborationSession | null>(null);
  const [status, setStatus] = useState<CollaborationStatus | null>(null);
  const hasConnectedRef = useRef(false);
  const initialContentRef = useRef(content);

  useEffect(() => {
    if (pageId === null || !canEdit) return;

    let isActive = true;
    let provider: HocuspocusProvider | null = null;
    let ydoc: Doc | null = null;
    hasConnectedRef.current = false;

    const setProviderStatus = ({ status: providerStatus }: onStatusParameters): void => {
      if (!isActive) return;
      if (providerStatus === 'connected') hasConnectedRef.current = true;
      if (providerStatus === 'connecting') {
        setStatus(hasConnectedRef.current ? 'reconnecting' : 'connecting');
        return;
      }
      setStatus(providerStatus);
    };

    const connect = async (): Promise<void> => {
      setStatus('connecting');
      const result = await getPageCollaborationToken({ pageId });
      if (!isActive) return;
      if (!isActionSuccess<{ readonly token: string }>(result)) {
        setStatus('error');
        return;
      }

      ydoc = new Doc();
      const fragment = ydoc.getXmlFragment('prosemirror');
      provider = new HocuspocusProvider({
        document: ydoc,
        name: createCollaborationDocumentName(pageId),
        onAuthenticationFailed: () => setStatus('error'),
        onStatus: setProviderStatus,
        onSynced: ({ state }) => {
          if (!isActive || !state || provider === null || ydoc === null) return;
          if (fragment.length === 0) {
            prosemirrorToYXmlFragment(pageEditorSchema.nodeFromJSON(initialContentRef.current), fragment);
          }
          setSession({ fragment, pageId, provider, ydoc });
        },
        token: result.data.token,
        url: createCollaborationWebSocketUrl(env.NEXT_PUBLIC_COLLABORATION_WS_URL),
      });
    };

    void connect().catch(() => {
      if (isActive) setStatus('error');
    });

    return () => {
      isActive = false;
      setSession(null);
      provider?.destroy();
      ydoc?.destroy();
    };
  }, [canEdit, pageId]);

  const activeSession = session?.pageId === pageId && canEdit ? session : null;
  return { session: activeSession, status: pageId !== null && canEdit ? status : null };
};
