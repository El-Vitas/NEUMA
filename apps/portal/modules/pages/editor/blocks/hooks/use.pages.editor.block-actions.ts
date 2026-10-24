'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Node as EditorNode } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { type RefObject, useCallback } from 'react';
import { toast } from 'sonner';
import { callAction, hasActionError } from '@/shared/lib/action-result';
import { copyTextToClipboard } from '@/shared/lib/clipboard.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { addBlocksToPageAction } from '../../../server/actions/pages.actions';
import type { PageDestination } from '../../menus/types/pages.editor.destination.types';
import { buildSyncedBlockContent } from '../../structure/lib/pages.editor.synced.lib';
import { createDeleteSentPageBlocksCommand } from '../lib/pages.editor.block-delete.lib';
import { buildPageEditorBlockLink, readPageEditorBlockId } from '../lib/pages.editor.block-link.lib';
import { changePageEditorBlockRequest, closePageEditorBlockRequest } from '../lib/pages.editor.block-menu.lib';
import { readSelectedPageBlocks, readSelectedPageBlocksContent } from '../lib/pages.editor.block-travel.lib';
import type { PageEditorBlockActions } from '../types/pages.editor.block-actions.types';
import type { PageEditorBlockRequestKind } from '../types/pages.editor.block-request.types';

export const usePagesEditorBlockActions = (
  editorViewRef: RefObject<EditorView | null>,
  shownPage: { readonly pageId: string | null; readonly spaceId: string },
): PageEditorBlockActions => {
  const t = useTranslations('pages');
  const router = useRouter();

  /** Focus is restored on the next frame: the menu that held it is still mounted until then. */
  const runCommand = useCallback(
    (command: Command): boolean => {
      const editorView = editorViewRef.current;
      if (editorView === null) return false;
      closePageEditorBlockRequest(editorView, 'actions');
      const isDone = command(editorView.state, editorView.dispatch);
      requestAnimationFrame(() => editorView.focus());
      return isDone;
    },
    [editorViewRef],
  );

  const ask = useCallback(
    (kind: PageEditorBlockRequestKind): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      changePageEditorBlockRequest(editorView, kind);
    },
    [editorViewRef],
  );

  const close = useCallback(
    (kind: PageEditorBlockRequestKind): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      closePageEditorBlockRequest(editorView, kind);
      requestAnimationFrame(() => editorView.focus());
    },
    [editorViewRef],
  );

  const copyLink = useCallback(async (): Promise<void> => {
    const editorView = editorViewRef.current;
    if (editorView === null) return;
    const blockId = readPageEditorBlockId(editorView.state);
    if (blockId === null) return;
    closePageEditorBlockRequest(editorView, 'actions');

    if (await copyTextToClipboard(buildPageEditorBlockLink(globalThis.location.href, blockId)))
      toast.success(t('blockLinkCopied'));
    else toast.error(t('blockLinkCopyFailed'));
  }, [editorViewRef, t]);

  const announceHandover = useCallback(
    (destination: PageDestination, sent: readonly EditorNode[]): void => {
      if (!runCommand(createDeleteSentPageBlocksCommand(sent))) {
        toast.warning(t('moveBlocksKept', { page: destination.label }));
        return;
      }
      toast.success(t('moveBlocksDone', { page: destination.label }), {
        action: {
          label: t('moveBlocksVisit'),
          onClick: () => router.push(ROUTES.PORTAL_SPACE_PAGE(destination.spaceId, destination.id)),
        },
      });
    },
    [router, runCommand, t],
  );

  /** Adds to the other page first, then deletes the blocks that were sent, not the current selection. */
  const sendOver = useCallback(
    async (destination: PageDestination): Promise<void> => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      const travelling = readSelectedPageBlocksContent(editorView.state);
      const sent = readSelectedPageBlocks(editorView.state);
      if (travelling === null || sent === null) return;

      const result = await callAction(() =>
        addBlocksToPageAction({ content: travelling, pageId: destination.id, spaceId: destination.spaceId }),
      );
      if (hasActionError(result)) toast.error(t('moveBlocksError'));
      else announceHandover(destination, sent);
    },
    [announceHandover, editorViewRef, t],
  );

  const handOver = useCallback(
    (destination: PageDestination): void => {
      void sendOver(destination);
    },
    [sendOver],
  );

  /** Links the block by reference rather than copying it: one block, shown in two pages. */
  const syncInto = useCallback(
    (destination: PageDestination): void => {
      const editorView = editorViewRef.current;
      if (editorView === null) return;
      const blockId = readPageEditorBlockId(editorView.state);
      const sourcePageId = shownPage.pageId;
      const sourceSpaceId = shownPage.spaceId;
      if (blockId === null || sourcePageId === null) {
        toast.error(t('syncedNeedsBlock'));
        return;
      }
      closePageEditorBlockRequest(editorView, 'sync');

      void callAction(() =>
        addBlocksToPageAction({
          content: buildSyncedBlockContent({ blockId, pageId: sourcePageId, spaceId: sourceSpaceId }),
          pageId: destination.id,
          spaceId: destination.spaceId,
        }),
      ).then((result) => {
        if (hasActionError(result)) toast.error(t('syncedError'));
        else
          toast.success(t('syncedDone', { page: destination.label }), {
            action: {
              label: t('moveBlocksVisit'),
              onClick: () => router.push(ROUTES.PORTAL_SPACE_PAGE(destination.spaceId, destination.id)),
            },
          });
      });
    },
    [editorViewRef, router, shownPage.pageId, shownPage.spaceId, t],
  );

  return { ask, close, copyLink, handOver, runCommand, syncInto };
};
