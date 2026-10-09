'use client';

import { useEffect, useRef } from 'react';
import {
  createCollaborativePageEditorState,
  keepClicksAcrossChangesFromOthers,
  readWhereThisPersonWrites,
  restoreSelectionIfStillWriting,
} from '../../lib/pages.collaboration.lib';
import type { PagesEditorLiveBindingOptions } from '../types/pages.editor.live-binding.types';

/**
 * Ties the editor to the live document of the page while there is one.
 *
 * When the live document arrives, the editor starts writing into it without
 * losing where the person was writing nor the search they had open. When it is
 * given up for good, what the page says now is handed over to be sent, since
 * nothing keeps it any more.
 */
export const usePagesEditorLiveBinding = ({
  editorViewRef,
  followHeadingsRef,
  keepWhatCanBeKeptRef,
  labels,
  mountedEditorView,
  resumeFind,
  session,
  syncFind,
}: PagesEditorLiveBindingOptions): void => {
  const wasLiveRef = useRef(false);

  useEffect(() => {
    const view = editorViewRef.current;
    if (session !== null || view === null || !wasLiveRef.current) return;
    wasLiveRef.current = false;
    keepWhatCanBeKeptRef.current(view.state);
  }, [editorViewRef, keepWhatCanBeKeptRef, session]);

  useEffect(() => {
    if (session === null || mountedEditorView === null || mountedEditorView.isDestroyed) return;
    wasLiveRef.current = true;
    const { anchor, head } = readWhereThisPersonWrites(mountedEditorView);
    const stopKeepingClicks = keepClicksAcrossChangesFromOthers(
      mountedEditorView,
      session.ydoc,
      session.provider.awareness,
    );
    mountedEditorView.updateState(
      createCollaborativePageEditorState(
        { awareness: session.provider.awareness, fragment: session.fragment },
        labels.selectBlock,
        labels.insertBlock,
        labels.writeHere,
        labels.foldHeading,
        labels.resizeColumn,
      ),
    );
    restoreSelectionIfStillWriting(mountedEditorView, anchor, head);
    followHeadingsRef.current(mountedEditorView.state);
    resumeFind(mountedEditorView);
    syncFind(mountedEditorView);
    return stopKeepingClicks;
  }, [followHeadingsRef, labels, mountedEditorView, resumeFind, session, syncFind]);
};
