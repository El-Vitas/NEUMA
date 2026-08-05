import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { usePagesAutosave } from '@/modules/pages/hooks/use.pages.autosave';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';

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
