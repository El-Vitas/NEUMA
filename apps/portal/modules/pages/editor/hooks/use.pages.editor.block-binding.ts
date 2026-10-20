'use client';

import { useEffect, useRef, useState } from 'react';
import { env } from '@/config/env.config';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { createBlockSyncEngine } from '../../block-sync/lib/block-sync.engine.lib';
import { createBlockLiveSession } from '../../block-sync/lib/block-sync.session.lib';
import { openBrowserBlockLiveSocket } from '../../block-sync/lib/block-sync.socket.lib';
import { getBlockLiveToken } from '../../block-sync/server/actions/block-sync.actions';
import type { BlockSyncEngine } from '../../block-sync/types/block-sync.types';
import type { PagesAutosaveDisplayState } from '../../types/pages.autosave.types';
import type { CollaborationStatus, PageCollaborationParticipant } from '../../types/pages.collaboration.types';
import type {
  PagesEditorBlockBinding,
  PagesEditorBlockBindingOptions,
} from '../types/pages.editor.block-binding.types';

const requestLiveToken = async (): Promise<string | null> => {
  const result = await callAction(() => getBlockLiveToken({}));
  return isActionSuccess<{ readonly token: string }>(result) ? result.data.token : null;
};

/**
 * Keeps the editor on the page's blocks through the live channel.
 * The socket is the one place where state arrives from outside React.
 */
export const usePagesEditorBlockBinding = (options: PagesEditorBlockBindingOptions): PagesEditorBlockBinding => {
  const { pageId, spaceId } = options;
  const localUserId = options.localUserId ?? null;
  const initialBlocks = options.initialBlocks ?? null;
  const isViewer = !options.isEnabled;
  const [saveState, setSaveState] = useState<PagesAutosaveDisplayState>('idle');
  const [status, setStatus] = useState<CollaborationStatus | null>(null);
  const [participants, setParticipants] = useState<readonly PageCollaborationParticipant[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const engineRef = useRef<BlockSyncEngine | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (initialBlocks === null) return;
    const engine = createBlockSyncEngine({
      bridge: {
        readContent: () => optionsRef.current.readContent(),
        replaceContent: (content) => optionsRef.current.replaceContent(content),
      },
      callbacks: {
        onParticipantsChange: setParticipants,
        onReadOnly: () => setIsReadOnly(true),
        onSaveStateChange: setSaveState,
        onStatusChange: setStatus,
      },
      createId: () => crypto.randomUUID(),
      createSession: (handlers) =>
        createBlockLiveSession({
          handlers,
          onDiscussionChanged: () => optionsRef.current.onDiscussionChanged?.(),
          openSocket: openBrowserBlockLiveSocket,
          pageId,
          requestToken: requestLiveToken,
          url: env.NEXT_PUBLIC_LIVE_WS_URL,
        }),
      initialBlocks,
      isViewer,
      localUserId,
      pageId,
      resolveParticipant: (userId) => ({
        color: null,
        name: optionsRef.current.personOptions.find((person) => person.id === userId)?.name ?? '',
      }),
      spaceId,
    });
    engineRef.current = engine;
    return () => {
      engineRef.current = null;
      engine.destroy();
    };
  }, [initialBlocks, isViewer, localUserId, pageId, spaceId]);

  const isActive = initialBlocks !== null;
  return {
    canWrite: options.isEnabled && !isReadOnly,
    collaboration: isActive ? { participants, status } : null,
    flush: () => engineRef.current?.flush() ?? Promise.resolve(true),
    isReadOnly,
    keepContentLive: (content) => engineRef.current?.notifyContentChange(content),
    reportSelection: (selection) => engineRef.current?.reportSelection(selection),
    saveState: isActive ? saveState : options.fallbackSaveState,
  };
};
