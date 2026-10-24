'use client';

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import type { PageEditorSurfaceRect } from '../../editor/menus/types/pages.editor.surface.types';
import { PAGE_PREVIEW_CLOSE_DELAY_MS, PAGE_PREVIEW_OPEN_DELAY_MS } from '../constants/pages.preview.constants';
import { isWithinThePagePreviewCard, readPagePreviewLink, readPagePreviewSpot } from '../lib/pages.preview.lib';
import { getPagePreviewAction } from '../server/actions/pages.preview.actions';
import type {
  PagePreviewAtHand,
  PagePreviewContent,
  PagePreviewLinkMatch,
  PagePreviewOutcome,
  PagesPreviewState,
} from '../types/pages.preview.types';

const readPagePreviewOutcome = async (link: PagePreviewLinkMatch): Promise<PagePreviewOutcome> => {
  const response = await callAction(() =>
    getPagePreviewAction({ pageId: link.target.pageId, spaceId: link.target.spaceId }),
  );
  return isActionSuccess<PagePreviewContent>(response) ? { content: response.data, kind: 'found' } : { kind: 'denied' };
};

export const usePagesPreview = (
  surfaceRef: RefObject<HTMLElement | null>,
  readSurfaceRect: () => PageEditorSurfaceRect | null,
): PagesPreviewState => {
  const [atHand, setAtHand] = useState<PagePreviewAtHand | null>(null);
  const [outcome, setOutcome] = useState<PagePreviewOutcome | null>(null);
  const anchorRef = useRef<Element | null>(null);
  const requestIdRef = useRef(0);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimeout = useCallback((): void => {
    if (openTimeoutRef.current === null) return;
    clearTimeout(openTimeoutRef.current);
    openTimeoutRef.current = null;
  }, []);

  const clearCloseTimeout = useCallback((): void => {
    if (closeTimeoutRef.current === null) return;
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }, []);

  const close = useCallback((): void => {
    clearOpenTimeout();
    clearCloseTimeout();
    requestIdRef.current += 1;
    anchorRef.current = null;
    setAtHand(null);
    setOutcome(null);
  }, [clearCloseTimeout, clearOpenTimeout]);

  const scheduleClose = useCallback((): void => {
    clearOpenTimeout();
    anchorRef.current = null;
    closeTimeoutRef.current = setTimeout(close, PAGE_PREVIEW_CLOSE_DELAY_MS);
  }, [clearOpenTimeout, close]);

  const open = useCallback(
    (link: PagePreviewLinkMatch, surfaceRect: PageEditorSurfaceRect): void => {
      clearCloseTimeout();
      anchorRef.current = link.anchor;
      clearOpenTimeout();
      openTimeoutRef.current = setTimeout(() => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        setAtHand({ spot: readPagePreviewSpot(link.anchor, surfaceRect), target: link.target });
        setOutcome(null);
        void readPagePreviewOutcome(link).then((result) => {
          if (requestIdRef.current !== requestId) return;
          setOutcome(result);
        });
      }, PAGE_PREVIEW_OPEN_DELAY_MS);
    },
    [clearCloseTimeout, clearOpenTimeout],
  );

  useEffect(() => {
    const container = surfaceRef.current;
    if (container === null) return;

    /** Layout is measured only after a link is found: `mouseover` fires over all plain text while typing. */
    const followTheAnchorUnderPointer = (target: EventTarget | null): void => {
      const link = readPagePreviewLink(container, target);
      if (link === null) {
        /** Hovering the card cancels the close already scheduled. */
        if (isWithinThePagePreviewCard(target)) clearCloseTimeout();
        else scheduleClose();
        return;
      }
      if (link.anchor === anchorRef.current) return;
      const surfaceRect = readSurfaceRect();
      if (surfaceRect === null) return;
      open(link, surfaceRect);
    };

    const handlePointerOver = (event: Event): void => followTheAnchorUnderPointer(event.target);
    const handlePointerLeave = (): void => scheduleClose();
    const handleFocusIn = (event: Event): void => followTheAnchorUnderPointer(event.target);
    const handleFocusOut = (): void => scheduleClose();

    container.addEventListener('mouseover', handlePointerOver);
    container.addEventListener('mouseleave', handlePointerLeave);
    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);
    return () => {
      container.removeEventListener('mouseover', handlePointerOver);
      container.removeEventListener('mouseleave', handlePointerLeave);
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
      clearOpenTimeout();
      clearCloseTimeout();
    };
  }, [surfaceRef, readSurfaceRect, open, scheduleClose, clearOpenTimeout, clearCloseTimeout]);

  useEffect(() => {
    if (atHand === null) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [atHand, close]);

  return { atHand, close, hold: clearCloseTimeout, letGo: scheduleClose, outcome };
};
