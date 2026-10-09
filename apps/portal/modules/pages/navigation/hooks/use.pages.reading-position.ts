'use client';

import { type RefObject, useEffect, useRef } from 'react';
import {
  PAGES_READING_POSITION_POINTER_INTERRUPT_EVENTS,
  PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT,
  PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS,
  PAGES_READING_POSITION_SAVE_DEBOUNCE_MS,
  PAGES_READING_POSITION_SCROLL_KEYS,
  PAGES_READING_POSITION_SCROLLABLE_OVERFLOWS,
  PAGES_READING_POSITION_STORAGE_KEY_PREFIX,
} from '../constants/use.pages.reading-position.constants';

/** The portal scrolls an inner area inside the viewport, so scrolling the window would do nothing. */
const findReadingArea = (pageElement: HTMLElement | null): HTMLElement | null => {
  for (let element = pageElement; element !== null; element = element.parentElement) {
    if (PAGES_READING_POSITION_SCROLLABLE_OVERFLOWS.includes(getComputedStyle(element).overflowY)) return element;
  }
  return null;
};

const readScrollTop = (readingArea: HTMLElement | null): number =>
  readingArea === null ? globalThis.scrollY : readingArea.scrollTop;

const scrollTo = (readingArea: HTMLElement | null, top: number): void => {
  if (readingArea === null) {
    globalThis.scrollTo({ top });
    return;
  }
  readingArea.scrollTo({ top });
};

const buildReadingPositionStorageKey = (pageId: string): string =>
  `${PAGES_READING_POSITION_STORAGE_KEY_PREFIX}${pageId}`;

const readSavedScrollTop = (pageId: string): number | null => {
  const raw = sessionStorage.getItem(buildReadingPositionStorageKey(pageId));
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const saveScrollTop = (pageId: string, scrollTop: number): void => {
  sessionStorage.setItem(buildReadingPositionStorageKey(pageId), String(scrollTop));
};

/**
 * Content can still arrive after the first paint, so the restore is retried a few times after mount.
 * It stops as soon as the reader scrolls, and from then on their position is saved.
 */
export const usePagesReadingPosition = (pageId: string | null, pageRef: RefObject<HTMLElement | null>): void => {
  const hasRestored = useRef(false);

  useEffect(() => {
    hasRestored.current = false;
    if (pageId === null) return;

    const readingArea = findReadingArea(pageRef.current);

    const savedScrollTop = readSavedScrollTop(pageId);
    if (savedScrollTop === null) {
      hasRestored.current = true;
      return;
    }

    let isRestoring = true;
    let attemptsLeft = PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT;
    let nextAttempt: ReturnType<typeof setTimeout> | undefined;

    const stopRestoring = (): void => {
      if (!isRestoring) return;
      isRestoring = false;
      hasRestored.current = true;
      for (const eventName of PAGES_READING_POSITION_POINTER_INTERRUPT_EVENTS) {
        globalThis.removeEventListener(eventName, stopRestoring);
      }
      globalThis.removeEventListener('keydown', stopRestoringOnScrollKey);
    };

    const stopRestoringOnScrollKey = (event: KeyboardEvent): void => {
      if (PAGES_READING_POSITION_SCROLL_KEYS.includes(event.key)) stopRestoring();
    };

    const restore = (): void => {
      if (!isRestoring) return;
      scrollTo(readingArea, savedScrollTop);
      attemptsLeft -= 1;
      if (attemptsLeft > 0) {
        nextAttempt = setTimeout(restore, PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS);
        return;
      }
      stopRestoring();
    };

    for (const eventName of PAGES_READING_POSITION_POINTER_INTERRUPT_EVENTS) {
      globalThis.addEventListener(eventName, stopRestoring, { passive: true });
    }
    globalThis.addEventListener('keydown', stopRestoringOnScrollKey);

    restore();

    return () => {
      isRestoring = false;
      clearTimeout(nextAttempt);
      for (const eventName of PAGES_READING_POSITION_POINTER_INTERRUPT_EVENTS) {
        globalThis.removeEventListener(eventName, stopRestoring);
      }
      globalThis.removeEventListener('keydown', stopRestoringOnScrollKey);
    };
  }, [pageId, pageRef]);

  useEffect(() => {
    if (pageId === null) return;

    const readingArea = findReadingArea(pageRef.current);
    const scrollSource: EventTarget = readingArea ?? globalThis;
    let debounceId: ReturnType<typeof setTimeout> | undefined;

    const persistScrollTop = (): void => {
      if (!hasRestored.current) return;
      saveScrollTop(pageId, readScrollTop(readingArea));
    };

    const persistScrollTopDebounced = (): void => {
      if (debounceId !== undefined) clearTimeout(debounceId);
      debounceId = setTimeout(persistScrollTop, PAGES_READING_POSITION_SAVE_DEBOUNCE_MS);
    };

    scrollSource.addEventListener('scroll', persistScrollTopDebounced, { passive: true });
    globalThis.addEventListener('pagehide', persistScrollTop);

    return () => {
      if (debounceId !== undefined) clearTimeout(debounceId);
      scrollSource.removeEventListener('scroll', persistScrollTopDebounced);
      globalThis.removeEventListener('pagehide', persistScrollTop);
    };
  }, [pageId, pageRef]);
};
