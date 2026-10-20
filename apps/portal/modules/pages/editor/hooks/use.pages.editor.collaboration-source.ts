'use client';

import { usePagesCollaboration } from '../../hooks/use.pages.collaboration';
import type { PageCollaborationSession } from '../../types/pages.collaboration.types';
import type {
  PagesEditorCollaborationSource,
  PagesEditorCollaborationSourceOptions,
} from '../types/pages.editor.block-binding.types';

/**
 * Where the editor takes its live state from: the block channel when it keeps the page, otherwise a collaboration
 * session. No session is opened for a page the block channel keeps.
 */
export const usePagesEditorCollaborationSource = ({
  blockCollaboration,
  canEdit,
  displayName,
  pageId,
}: PagesEditorCollaborationSourceOptions): PagesEditorCollaborationSource => {
  const session = usePagesCollaboration(blockCollaboration === null ? pageId : null, canEdit, displayName);
  const liveSession: PageCollaborationSession | null = session.session;
  return {
    participants: blockCollaboration?.participants ?? session.participants,
    session: liveSession,
    status: blockCollaboration?.status ?? session.status,
  };
};
