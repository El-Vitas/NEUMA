'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { readPageEditorDragState } from '../lib/pages.editor.block-drag.lib';
import {
  createPageEditorBlockRangeRemovalCommand,
  readPageEditorBlocksContent,
  readPageEditorBlocksTitle,
} from '../lib/pages.editor.block-page.lib';
import { findPageEditorPageDropTarget, markPageEditorPageDropTarget } from '../lib/pages.editor.page-drop.lib';
import { createPageAction } from '../server/actions/pages.actions';
import type { PageEditorBlockRange } from '../types/pages.editor.block-drag.types';
import type { PageEditorPageDropParameters } from '../types/pages.editor.page-drop.types';

/**
 * Dragging blocks onto the page tree turns them into a page of their own.
 *
 * The blocks that travel are remembered while the drag is on: the editor puts
 * the drag away the moment the button is released, and by then this still needs
 * to know what was being carried.
 */
export const usePagesEditorPageDrop = ({ editorViewRef, spaceId }: PageEditorPageDropParameters): void => {
  const t = useTranslations('pages');
  const router = useRouter();
  const travellingRef = useRef<PageEditorBlockRange | null>(null);

  useEffect(() => {
    const becomePage = (pageId: string, range: PageEditorBlockRange): void => {
      const editorView = editorViewRef.current;
      const content = editorView === null ? null : readPageEditorBlocksContent(editorView.state, range);
      if (editorView === null || content === null) return;
      const title = readPageEditorBlocksTitle(editorView.state, range);

      void createPageAction({ content, parentId: pageId, spaceId, title }).then((result) => {
        if (!isActionSuccess(result)) {
          toast.error(t('blocksMadePageError'));
          return;
        }
        createPageEditorBlockRangeRemovalCommand(range)(editorView.state, editorView.dispatch);
        router.refresh();
        toast.success(t('blocksMadePage', { page: result.data.title }), {
          action: {
            label: t('moveBlocksVisit'),
            onClick: () => router.push(ROUTES.PORTAL_SPACE_PAGE(spaceId, result.data.id)),
          },
        });
      });
    };

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
      becomePage(target.pageId, range);
    };

    document.addEventListener('mousemove', followPointer);
    document.addEventListener('mouseup', dropOnPage);
    return () => {
      document.removeEventListener('mousemove', followPointer);
      document.removeEventListener('mouseup', dropOnPage);
    };
  }, [editorViewRef, router, spaceId, t]);
};
