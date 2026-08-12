'use client';

import { useTranslations } from 'next-intl';
import { type RefObject, useEffect } from 'react';
import { toast } from 'sonner';
import { PAGE_EDITOR_BLOCK_ARRIVAL_MS } from '../constants/pages.editor.blocks.constants';
import {
  findPageEditorBlockElement,
  readPageEditorBlockLinkTarget,
  revealPageEditorBlock,
} from '../lib/pages.editor.block-link.lib';

/**
 * Arriving with a block in the address takes the page to that block and marks
 * it for a moment, so a shared link lands where it pointed.
 *
 * A block that is no longer there says so, instead of leaving the reader
 * looking for something that was deleted.
 */
export const usePagesEditorBlockArrival = (editorHostRef: RefObject<HTMLElement | null>): void => {
  const t = useTranslations('pages');

  useEffect(() => {
    const wantedBlockId = readPageEditorBlockLinkTarget(window.location.href);
    const editorHost = editorHostRef.current;
    if (wantedBlockId === null || editorHost === null) return;

    const block = findPageEditorBlockElement(editorHost, wantedBlockId);
    if (block === null) {
      toast.error(t('blockLinkMissing'));
      return;
    }

    const unmark = revealPageEditorBlock(block);
    const timeoutId = setTimeout(unmark, PAGE_EDITOR_BLOCK_ARRIVAL_MS);
    return () => {
      clearTimeout(timeoutId);
      unmark();
    };
  }, [editorHostRef, t]);
};
