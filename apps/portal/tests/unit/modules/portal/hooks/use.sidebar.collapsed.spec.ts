import { describe, expect, it, spyOn } from 'bun:test';
import { act, fireEvent, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { SIDEBAR_STORAGE_KEY } from '@/modules/portal/constants/sidebar.constants';
import { useSidebarCollapsed } from '@/modules/portal/hooks/use.sidebar.collapsed';

describe('useSidebarCollapsed', () => {
  it('persists to storage exactly once per toggle even when StrictMode invokes the state updater twice', () => {
    localStorage.removeItem(SIDEBAR_STORAGE_KEY);
    const { result } = renderHook(() => useSidebarCollapsed(), { wrapper: StrictMode });
    const serializeSpy = spyOn(JSON, 'stringify');

    act(() => {
      const [, toggle] = result.current;
      toggle();
    });

    expect(serializeSpy).toHaveBeenCalledTimes(1);
    serializeSpy.mockRestore();
  });

  it('reflects the toggled state and writes it to storage', () => {
    localStorage.removeItem(SIDEBAR_STORAGE_KEY);
    const { result } = renderHook(() => useSidebarCollapsed());

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe(JSON.stringify(true));
  });

  it('does not toggle while a person is typing in a text field', () => {
    localStorage.removeItem(SIDEBAR_STORAGE_KEY);
    const { result } = renderHook(() => useSidebarCollapsed());
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();

    act(() => {
      fireEvent.keyDown(input, { ctrlKey: true, key: '.' });
    });

    expect(result.current[0]).toBe(false);
    input.remove();
  });
});
