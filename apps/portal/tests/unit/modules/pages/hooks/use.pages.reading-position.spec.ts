import { afterEach, beforeEach, describe, expect, it, jest, spyOn } from 'bun:test';
import { act, fireEvent, renderHook } from '@testing-library/react';
import {
  PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT,
  PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS,
  PAGES_READING_POSITION_SAVE_DEBOUNCE_MS,
  PAGES_READING_POSITION_STORAGE_KEY_PREFIX,
} from '@/modules/pages/navigation/constants/use.pages.reading-position.constants';
import { usePagesReadingPosition } from '@/modules/pages/navigation/hooks/use.pages.reading-position';

const PAGE_ID = '11111111-1111-4111-8111-111111111111';

const buildStorageKey = (pageId: string): string => `${PAGES_READING_POSITION_STORAGE_KEY_PREFIX}${pageId}`;

/** No reading area around the page leaves the whole window as the thing that scrolls. */
const NO_READING_AREA = { current: null };

const buildReadingArea = (): { readonly page: HTMLElement; readonly readingArea: HTMLElement } => {
  const readingArea = document.createElement('div');
  readingArea.style.overflowY = 'auto';
  const page = document.createElement('section');
  readingArea.append(page);
  document.body.append(readingArea);
  return { page, readingArea };
};

describe('usePagesReadingPosition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    sessionStorage.clear();
  });

  it('does nothing when no reading position was saved for this page', () => {
    const scrollToSpy = spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => usePagesReadingPosition(PAGE_ID, NO_READING_AREA));

    expect(scrollToSpy).not.toHaveBeenCalled();
    scrollToSpy.mockRestore();
  });

  it('restores a saved position, retrying in case content is still arriving', () => {
    sessionStorage.setItem(buildStorageKey(PAGE_ID), '450');
    const scrollToSpy = spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => usePagesReadingPosition(PAGE_ID, NO_READING_AREA));
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 450 });
    expect(scrollToSpy.mock.calls.length).toBe(1);

    act(() => {
      jest.advanceTimersByTime(
        PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS * PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT,
      );
    });
    expect(scrollToSpy.mock.calls.length).toBe(PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT);

    scrollToSpy.mockRestore();
  });

  it('writes the reading position back once restoring has finished and the reader scrolls on their own', () => {
    sessionStorage.setItem(buildStorageKey(PAGE_ID), '10');
    const scrollToSpy = spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => usePagesReadingPosition(PAGE_ID, NO_READING_AREA));

    act(() => {
      jest.advanceTimersByTime(
        PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS * PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT,
      );
    });

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 777 });
    act(() => {
      fireEvent.scroll(window);
      jest.advanceTimersByTime(PAGES_READING_POSITION_SAVE_DEBOUNCE_MS);
    });

    expect(sessionStorage.getItem(buildStorageKey(PAGE_ID))).toBe('777');
    scrollToSpy.mockRestore();
  });

  it('does not persist a scroll that happens before restoring finishes', () => {
    sessionStorage.setItem(buildStorageKey(PAGE_ID), '10');
    const scrollToSpy = spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => usePagesReadingPosition(PAGE_ID, NO_READING_AREA));

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 999 });
    act(() => {
      fireEvent.scroll(window);
      jest.advanceTimersByTime(PAGES_READING_POSITION_SAVE_DEBOUNCE_MS);
    });

    expect(sessionStorage.getItem(buildStorageKey(PAGE_ID))).toBe('10');
    scrollToSpy.mockRestore();
  });

  it('cancels restoring as soon as the reader scrolls with the wheel, and keeps their position from then on', () => {
    sessionStorage.setItem(buildStorageKey(PAGE_ID), '450');
    const scrollToSpy = spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => usePagesReadingPosition(PAGE_ID, NO_READING_AREA));
    expect(scrollToSpy.mock.calls.length).toBe(1);

    act(() => {
      fireEvent.wheel(window);
      jest.advanceTimersByTime(
        PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS * PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT,
      );
    });
    expect(scrollToSpy.mock.calls.length).toBe(1);

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 321 });
    act(() => {
      fireEvent.scroll(window);
      jest.advanceTimersByTime(PAGES_READING_POSITION_SAVE_DEBOUNCE_MS);
    });

    expect(sessionStorage.getItem(buildStorageKey(PAGE_ID))).toBe('321');
    scrollToSpy.mockRestore();
  });

  it('cancels restoring as soon as the reader touches the screen', () => {
    sessionStorage.setItem(buildStorageKey(PAGE_ID), '450');
    const scrollToSpy = spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => usePagesReadingPosition(PAGE_ID, NO_READING_AREA));

    act(() => {
      fireEvent.touchStart(window);
      jest.advanceTimersByTime(
        PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS * PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT,
      );
    });

    expect(scrollToSpy.mock.calls.length).toBe(1);
    scrollToSpy.mockRestore();
  });

  it('cancels restoring on a key that moves the page, such as Page Down', () => {
    sessionStorage.setItem(buildStorageKey(PAGE_ID), '450');
    const scrollToSpy = spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => usePagesReadingPosition(PAGE_ID, NO_READING_AREA));

    act(() => {
      fireEvent.keyDown(window, { key: 'PageDown' });
      jest.advanceTimersByTime(
        PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS * PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT,
      );
    });

    expect(scrollToSpy.mock.calls.length).toBe(1);
    scrollToSpy.mockRestore();
  });

  it('keeps restoring through an ordinary keystroke, such as typing in the title', () => {
    sessionStorage.setItem(buildStorageKey(PAGE_ID), '450');
    const scrollToSpy = spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => usePagesReadingPosition(PAGE_ID, NO_READING_AREA));

    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
      jest.advanceTimersByTime(
        PAGES_READING_POSITION_RESTORE_ATTEMPT_DELAY_MS * PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT,
      );
    });

    expect(scrollToSpy.mock.calls.length).toBe(PAGES_READING_POSITION_RESTORE_ATTEMPT_COUNT);
    scrollToSpy.mockRestore();
  });

  it('resets its restoring window when moving to a different page', () => {
    const otherPageId = '22222222-2222-4222-8222-222222222222';
    sessionStorage.setItem(buildStorageKey(PAGE_ID), '200');
    sessionStorage.setItem(buildStorageKey(otherPageId), '900');
    const scrollToSpy = spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const { rerender } = renderHook(({ pageId }) => usePagesReadingPosition(pageId, NO_READING_AREA), {
      initialProps: { pageId: PAGE_ID as string | null },
    });
    scrollToSpy.mockClear();

    act(() => {
      rerender({ pageId: otherPageId });
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 900 });
    scrollToSpy.mockRestore();
  });

  it('scrolls the reading area the page lives in, not the window', () => {
    sessionStorage.setItem(buildStorageKey(PAGE_ID), '450');
    const { page, readingArea } = buildReadingArea();
    const scrollToSpy = spyOn(readingArea, 'scrollTo').mockImplementation(() => undefined);
    const windowScrollToSpy = spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderHook(() => usePagesReadingPosition(PAGE_ID, { current: page }));

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 450 });
    expect(windowScrollToSpy).not.toHaveBeenCalled();

    scrollToSpy.mockRestore();
    windowScrollToSpy.mockRestore();
    readingArea.remove();
  });
});
