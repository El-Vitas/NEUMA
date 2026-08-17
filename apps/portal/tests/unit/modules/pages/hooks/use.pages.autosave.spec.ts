import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { usePagesAutosave } from '@/modules/pages/hooks/use.pages.autosave';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';

const AutosaveProbe = (): ReactElement => {
  const autosave = usePagesAutosave({ enabled: true, onSave: () => Promise.resolve(true) });
  return createElement('span', null, autosave.displayState);
};

const withMockedNavigatorOnLine = (isOnline: boolean, run: () => void): void => {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: isOnline });
  try {
    run();
  } finally {
    Reflect.deleteProperty(window.navigator, 'onLine');
  }
};

describe('usePagesAutosave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('coalesces consecutive edits into one debounced save', async () => {
    const save = mock(() => Promise.resolve(true));
    const { result } = renderHook(() => usePagesAutosave({ enabled: true, onSave: save }));

    act(() => {
      result.current.schedule();
      result.current.schedule();
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.hasSaved).toBe(true);
  });

  it('queues a newer revision until the active save finishes', async () => {
    let resolveFirstSave: ((didSave: boolean) => void) | null = null;
    const save = mock(
      () =>
        new Promise<boolean>((resolve) => {
          resolveFirstSave = resolve;
        }),
    );
    const { result } = renderHook(() => usePagesAutosave({ enabled: true, onSave: save }));

    act(() => {
      result.current.schedule();
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.schedule();
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      resolveFirstSave?.(true);
      await Promise.resolve();
    });
    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(2);
  });

  it('exposes an error state when saving fails', async () => {
    const save = mock(() => Promise.reject(new Error('request failed')));
    const { result } = renderHook(() => usePagesAutosave({ enabled: true, onSave: save }));

    act(() => {
      result.current.schedule();
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.displayState).toBe('failed');
  });

  it('reports a pending state while an edit waits to be sent, then when it finished saving', async () => {
    const save = mock(() => Promise.resolve(true));
    const { result } = renderHook(() => usePagesAutosave({ enabled: true, onSave: save }));

    expect(result.current.displayState).toBe('idle');

    act(() => {
      result.current.schedule();
    });
    expect(result.current.displayState).toBe('pending');
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.savedAt).toBeNull();

    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    expect(result.current.displayState).toBe('saving');

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.displayState).toBe('saved');
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.savedAt).not.toBeNull();
  });

  it('flags the offline state when the connection drops, and clears it once it returns', () => {
    const save = mock(() => Promise.resolve(true));
    const { result } = renderHook(() => usePagesAutosave({ enabled: true, onSave: save }));

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.displayState).toBe('offline');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.displayState).toBe('idle');
  });

  it('never reports offline on the first render, whatever navigator says', () => {
    withMockedNavigatorOnLine(false, () => {
      const html = renderToString(createElement(AutosaveProbe));
      expect(html).toContain('idle');
      expect(html).not.toContain('offline');
    });
  });

  it('picks up the real connection state once mounted', () => {
    withMockedNavigatorOnLine(false, () => {
      const save = mock(() => Promise.resolve(true));
      const { result } = renderHook(() => usePagesAutosave({ enabled: true, onSave: save }));
      expect(result.current.displayState).toBe('offline');
    });
  });

  it('never attempts a doomed save while offline, even past the debounce, and sends it once back online', async () => {
    const save = mock(() => Promise.resolve(true));
    const { result } = renderHook(() => usePagesAutosave({ enabled: true, onSave: save }));

    act(() => {
      window.dispatchEvent(new Event('offline'));
      result.current.schedule();
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });

    expect(save).not.toHaveBeenCalled();
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.displayState).toBe('offline');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.displayState).toBe('saved');
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('sends pending changes on its own once the connection returns, and says so', async () => {
    const save = mock(() => Promise.resolve(true));
    const { result } = renderHook(() => usePagesAutosave({ enabled: true, onSave: save }));

    act(() => {
      window.dispatchEvent(new Event('offline'));
      result.current.schedule();
    });
    expect(result.current.displayState).toBe('offline');
    expect(save).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.displayState).toBe('backOnline');
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.displayState).toBe('saved');
    expect(result.current.savedAt).not.toBeNull();
  });

  it('warns before closing the tab only while something is genuinely unsaved', async () => {
    const save = mock(() => Promise.resolve(true));
    const { result } = renderHook(() => usePagesAutosave({ enabled: true, onSave: save }));

    const cleanEvent = new Event('beforeunload', { cancelable: true });
    act(() => {
      window.dispatchEvent(cleanEvent);
    });
    expect(cleanEvent.defaultPrevented).toBe(false);

    act(() => {
      result.current.schedule();
    });
    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    act(() => {
      window.dispatchEvent(dirtyEvent);
    });
    expect(dirtyEvent.defaultPrevented).toBe(true);

    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const savedEvent = new Event('beforeunload', { cancelable: true });
    act(() => {
      window.dispatchEvent(savedEvent);
    });
    expect(savedEvent.defaultPrevented).toBe(false);
  });

  it('does not save after unmount and does not schedule when disabled', () => {
    const save = mock(() => Promise.resolve(true));
    const { result, unmount } = renderHook(() => usePagesAutosave({ enabled: true, onSave: save }));

    act(() => {
      result.current.schedule();
    });
    unmount();
    jest.runOnlyPendingTimers();

    expect(save).not.toHaveBeenCalled();

    const disabled = renderHook(() => usePagesAutosave({ enabled: false, onSave: save }));
    act(() => {
      disabled.result.current.schedule();
      jest.runOnlyPendingTimers();
    });

    expect(save).not.toHaveBeenCalled();
    disabled.unmount();
  });
});
