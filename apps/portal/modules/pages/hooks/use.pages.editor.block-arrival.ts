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
 * Arriving at a block: the page is taken to it and it is marked for a moment.
 *
 * Returns how to give up on this arrival, since another one may follow.
 */
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
 * Takes the page to the block the address asks for, whenever it asks.
 *
 * A link to a block on the page one is already reading changes only the
 * address, so the arrival is answered again on every change and not just when
 * the page is opened. The page is watched rather than glanced at: a link opens
 * before the editor has drawn anything, and only after giving it time is the
 * block reported missing.
 */
export const usePagesEditorBlockArrival = (editorHostRef: RefObject<HTMLElement | null>): void => {
  /**
   * The message is read as a value rather than through the translator itself:
   * the translator is a new function on every render, and depending on it would
   * restart the wait before it ever ran out.
   */
  const missingMessage = useTranslations('pages')('blockLinkMissing');

  useEffect(() => {
    /**
     * The page is asked for again on each arrival rather than held from the
     * first one: the editor may have redrawn since, and searching the page it
     * used to be would report every block as gone.
     */
    const arrive = (): (() => void) | null => {
      const blockId = readPageEditorBlockLinkTarget(window.location.href);
      const editorHost = editorHostRef.current;
      return blockId === null || editorHost === null ? null : arriveAtBlock(editorHost, blockId, missingMessage);
    };

    let giveUpArrival = arrive();
    const arriveAgain = (): void => {
      giveUpArrival?.();
      giveUpArrival = arrive();
    };

    window.addEventListener('hashchange', arriveAgain);
    return () => {
      window.removeEventListener('hashchange', arriveAgain);
      giveUpArrival?.();
    };
  }, [editorHostRef, missingMessage]);
};
