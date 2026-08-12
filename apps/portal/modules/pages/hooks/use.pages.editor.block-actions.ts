'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { type RefObject, useCallback } from 'react';
import { toast } from 'sonner';
import { hasActionError } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { deletePageEditorBlocks } from '../lib/pages.editor.block-delete.lib';
import { buildPageEditorBlockLink, readPageEditorBlockId } from '../lib/pages.editor.block-link.lib';
import { changePageEditorBlockRequest, closePageEditorBlockRequest } from '../lib/pages.editor.block-menu.lib';
import { readSelectedPageBlocksContent } from '../lib/pages.editor.block-travel.lib';
import { addBlocksToPageAction } from '../server/actions/pages.actions';
import type { PageEditorBlockActions } from '../types/pages.editor.block-actions.types';
import type { PageEditorBlockRequestKind } from '../types/pages.editor.block-request.types';
import type { PageDestination } from '../types/pages.editor.destination.types';

/**
 * What the block menu can set in motion, kept away from the editor's own
 * plumbing: running a command on the block, copying its address, and handing
 * the selected blocks to another page.
 */
export const usePagesEditorBlockActions = (editorViewRef: RefObject<EditorView | null>): PageEditorBlockActions => {
  const t = useTranslations('pages');
  const router = useRouter();

  /**
   * Gives the editor the focus back once the menu that held it is gone: asking
   * for it earlier achieves nothing, because what had the focus is about to be
   * removed and the page would be left with nothing focused at all.
   */
  const runCommand = useCallback(
    (command: Command): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      closePageEditorBlockRequest(editorView, 'actions');
      command(editorView.state, editorView.dispatch);
      requestAnimationFrame(() => editorView.focus());
    },
    [editorViewRef],
  );

  /** Asks the same blocks something else — their comments, or where they are going. */
  const ask = useCallback(
    (kind: PageEditorBlockRequestKind): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      changePageEditorBlockRequest(editorView, kind);
    },
    [editorViewRef],
  );

  /** Puts away what the block was asked, so leaving the menu never closes what it opened. */
  const close = useCallback(
    (kind: PageEditorBlockRequestKind): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      closePageEditorBlockRequest(editorView, kind);
      requestAnimationFrame(() => editorView.focus());
    },
    [editorViewRef],
  );

  const copyLink = useCallback((): void => {
    const editorView = editorViewRef.current;
    if (editorView === null) return;
    const blockId = readPageEditorBlockId(editorView.state);
    if (blockId === null) return;
    closePageEditorBlockRequest(editorView, 'actions');

    void navigator.clipboard
      .writeText(buildPageEditorBlockLink(window.location.href, blockId))
      .then(() => toast.success(t('blockLinkCopied')))
      .catch(() => toast.error(t('blockLinkCopyFailed')));
  }, [editorViewRef, t]);

  const announceHandover = useCallback(
    (destination: PageDestination): void => {
      runCommand(deletePageEditorBlocks);
      toast.success(t('moveBlocksDone', { page: destination.label }), {
        action: {
          label: t('moveBlocksVisit'),
          onClick: () => router.push(ROUTES.PORTAL_SPACE_PAGE(destination.spaceId, destination.id)),
        },
      });
    },
    [router, runCommand, t],
  );

  /**
   * The blocks are added to the other page first and only then taken off this
   * one, so a failure on the way leaves the page as it was.
   */
  const handOver = useCallback(
    (destination: PageDestination): void => {
      const editorView = editorViewRef.current;
      const travelling = editorView === null ? null : readSelectedPageBlocksContent(editorView.state);
      if (travelling === null) return;

      void addBlocksToPageAction({ content: travelling, pageId: destination.id, spaceId: destination.spaceId }).then(
        (result) => {
          if (hasActionError(result)) toast.error(t('moveBlocksError'));
          else announceHandover(destination);
        },
      );
    },
    [announceHandover, editorViewRef, t],
  );

  return { ask, close, copyLink, handOver, runCommand };
};
