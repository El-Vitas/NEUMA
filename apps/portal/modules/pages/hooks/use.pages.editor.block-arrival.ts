'use client';

import { useTranslations } from 'next-intl';
import { type RefObject, useEffect } from 'react';
import { toast } from 'sonner';
import {
  PAGE_EDITOR_BLOCK_ARRIVAL_MS,
  PAGE_EDITOR_BLOCK_ARRIVAL_WAIT_MS,
} from '../constants/pages.editor.blocks.constants';
import {
  readPageEditorBlockLinkTarget,
  revealPageEditorBlock,
  watchForPageEditorBlock,
} from '../lib/pages.editor.block-link.lib';

/**
 * Arriving with a block in the address takes the page to that block and marks
 * it for a moment, so a shared link lands where it pointed.
 *
 * The page is watched rather than glanced at: a link opens before the editor
 * has drawn anything, and only after giving it time is the block reported
 * missing.
 */
export const usePagesEditorBlockArrival = (editorHostRef: RefObject<HTMLElement | null>): void => {
  const t = useTranslations('pages');

  useEffect(() => {
    const blockId = readPageEditorBlockLinkTarget(window.location.href);
    const editorHost = editorHostRef.current;
    if (blockId === null || editorHost === null) return;

    let unmark: (() => void) | null = null;
    let unmarkTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const stopWatching = watchForPageEditorBlock({
      blockId,
      onFound: (block) => {
        unmark = revealPageEditorBlock(block);
        unmarkTimeoutId = setTimeout(() => unmark?.(), PAGE_EDITOR_BLOCK_ARRIVAL_MS);
      },
      onMissing: () => toast.error(t('blockLinkMissing')),
      root: editorHost,
      waitMs: PAGE_EDITOR_BLOCK_ARRIVAL_WAIT_MS,
    });

    return () => {
      stopWatching();
      if (unmarkTimeoutId !== null) clearTimeout(unmarkTimeoutId);
      unmark?.();
    };
  }, [editorHostRef, t]);
};
