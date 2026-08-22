'use client';

import { useEffect, useRef } from 'react';
import { usePagesEditorBlocksToPage } from '../../blocks/hooks/use.pages.editor.blocks-to-page';
import { readPageEditorDragState } from '../../blocks/lib/pages.editor.block-drag.lib';
import type { PageEditorBlockRange } from '../../blocks/types/pages.editor.block-drag.types';
import { findPageEditorPageDropTarget, markPageEditorPageDropTarget } from '../lib/pages.editor.page-drop.lib';
import type { PageEditorPageDropParameters } from '../types/pages.editor.page-drop.types';

/**
 * Dragging blocks onto the page tree turns them into a page of their own, held
 * by the page they were dropped on.
 *
 * The blocks that travel are remembered while the drag is on: the editor puts
 * the drag away the moment the button is released, and by then this still needs
 * to know what was being carried.
 */
export const usePagesEditorPageDrop = ({ editorViewRef, spaceId }: PageEditorPageDropParameters): void => {
  const turnIntoPage = usePagesEditorBlocksToPage({ editorViewRef, spaceId });
  const travellingRef = useRef<PageEditorBlockRange | null>(null);

  useEffect(() => {
    const followPointer = (event: MouseEvent): void => {
      const editorView = editorViewRef.current;
      const range = editorView === null ? null : readPageEditorDragState(editorView).range;
      travellingRef.current = range;
      markPageEditorPageDropTarget(range === null ? null : findPageEditorPageDropTarget(event));
    };

    const dropOnPage = (event: MouseEvent): void => {
      const range = travellingRef.current;
      const target = findPageEditorPageDropTarget(event);
      travellingRef.current = null;
      markPageEditorPageDropTarget(null);
      if (range === null || target === null) return;
      turnIntoPage({ leaveLink: false, parentPageId: target.pageId, range });
    };

    document.addEventListener('mousemove', followPointer);
    document.addEventListener('mouseup', dropOnPage);
    return () => {
      document.removeEventListener('mousemove', followPointer);
      document.removeEventListener('mouseup', dropOnPage);
    };
  }, [editorViewRef, turnIntoPage]);
};
