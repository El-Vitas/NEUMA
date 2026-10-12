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

/** Returns a function that abandons this arrival, since another one may follow. */
const arriveAtBlock = (editorHost: HTMLElement, blockId: string, missingMessage: string): (() => void) => {
  let unmark: (() => void) | null = null;
  let unmarkTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const stopWatching = watchForPageEditorBlock({
    blockId,
    onFound: (block) => {
      unmark = revealPageEditorBlock(block);
      unmarkTimeoutId = setTimeout(() => unmark?.(), PAGE_EDITOR_BLOCK_ARRIVAL_MS);
    },
    onMissing: () => toast.error(missingMessage),
    root: editorHost,
    waitMs: PAGE_EDITOR_BLOCK_ARRIVAL_WAIT_MS,
  });

  return () => {
    stopWatching();
    if (unmarkTimeoutId !== null) clearTimeout(unmarkTimeoutId);
    unmark?.();
  };
};

/**
 * Re-arrives on every hash change, since a link to a block on the current page changes only the address.
 * The block is awaited because the editor has drawn nothing yet when a link opens.
 */
export const usePagesEditorBlockArrival = (editorHostRef: RefObject<HTMLElement | null>): void => {
  /** Read as a string because the translator changes identity every render and would restart the wait. */
  const missingMessage = useTranslations('pages')('blockLinkMissing');

  useEffect(() => {
    /** The host is read per arrival because the editor may have redrawn since the first one. */
    const arrive = (): (() => void) | null => {
      const blockId = readPageEditorBlockLinkTarget(globalThis.location.href);
      const editorHost = editorHostRef.current;
      return blockId === null || editorHost === null ? null : arriveAtBlock(editorHost, blockId, missingMessage);
    };

    let giveUpArrival = arrive();
    const arriveAgain = (): void => {
      giveUpArrival?.();
      giveUpArrival = arrive();
    };

    globalThis.addEventListener('hashchange', arriveAgain);
    return () => {
      globalThis.removeEventListener('hashchange', arriveAgain);
      giveUpArrival?.();
    };
  }, [editorHostRef, missingMessage]);
};
