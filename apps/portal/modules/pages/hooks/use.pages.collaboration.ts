'use client';

import { useEffect, useRef, useState } from 'react';
import { createPageCollaborationSession } from '../lib/pages.collaboration.session.lib';
import type {
  CollaborationStatus,
  PageCollaborationParticipant,
  PageCollaborationResult,
  PageCollaborationSession,
  PageCollaborationSessionHandle,
} from '../types/pages.collaboration.types';
export const usePagesCollaboration = (
  pageId: string | null,
  canEdit: boolean,
  displayName: string | null = null,
): PageCollaborationResult => {
  const [session, setSession] = useState<PageCollaborationSession | null>(null);
  const [status, setStatus] = useState<CollaborationStatus | null>(null);
  const [participants, setParticipants] = useState<readonly PageCollaborationParticipant[]>([]);
  const displayNameRef = useRef(displayName);
  const sessionHandleRef = useRef<PageCollaborationSessionHandle | null>(null);

  useEffect(() => {
    displayNameRef.current = displayName;
    sessionHandleRef.current?.updateDisplayName();
  }, [displayName]);

  useEffect(() => {
    if (pageId === null || !canEdit) return;

    const sessionHandle = createPageCollaborationSession({
      callbacks: {
        onParticipantsChange: setParticipants,
        onSessionChange: setSession,
        onStatusChange: setStatus,
      },
      getDisplayName: () => displayNameRef.current,
      pageId,
    });
    sessionHandleRef.current = sessionHandle;

    return () => {
      sessionHandleRef.current = null;
      sessionHandle.destroy();
    };
  }, [canEdit, pageId]);

  const activeSession = session?.pageId === pageId && canEdit ? session : null;
  return {
    participants: activeSession === null ? [] : participants,
    session: activeSession,
    status: pageId !== null && canEdit ? status : null,
  };
};
