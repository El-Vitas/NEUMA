import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

const PATHNAME = '/spaces/space-1/pages/page-1';
let currentSearch = '';

const push = mock((_href: string) => undefined);
const replace = mock((_href: string) => undefined);

mock.module('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(currentSearch),
}));
mock.module('@/i18n/navigation', () => ({
  usePathname: () => PATHNAME,
  useRouter: () => ({ push, replace }),
}));

const { usePagesSidePanel } = await import('@/modules/pages/navigation/hooks/use.pages.side-panel');
const { PAGES_SIDE_PANEL_WIDTH_STORAGE_KEY, PAGES_SIDE_PANEL_DEFAULT_WIDTH_PX } = await import(
  '@/modules/pages/navigation/constants/pages.side-panel.constants'
);

describe('usePagesSidePanel', () => {
  beforeEach(() => {
    currentSearch = '';
    localStorage.clear();
    push.mockClear();
    replace.mockClear();
  });

  it('reads the panel page out of the address, when one is named', () => {
    currentSearch = 'panel=page-2';
    const { result } = renderHook(() => usePagesSidePanel(() => Promise.resolve()));

    expect(result.current.panelPageId).toBe('page-2');
  });

  it('has no panel page when the address names none', () => {
    const { result } = renderHook(() => usePagesSidePanel(() => Promise.resolve()));

    expect(result.current.panelPageId).toBeNull();
  });

  it('opens a page by writing it into the address, keeping whatever else was already asked', () => {
    currentSearch = 'search=quarterly';
    const { result } = renderHook(() => usePagesSidePanel(() => Promise.resolve()));

    act(() => {
      result.current.openPanel('page-2');
    });

    expect(push).toHaveBeenCalledWith(`${PATHNAME}?search=quarterly&panel=page-2`);
  });

  it('navigating within the panel opens the same way as opening it does', () => {
    const { result } = renderHook(() => usePagesSidePanel(() => Promise.resolve()));

    act(() => {
      result.current.navigateWithinPanel('space-1', 'page-3');
    });

    expect(push).toHaveBeenCalledWith(`${PATHNAME}?panel=page-3`);
  });

  it('waits for whatever the panel still has to save before writing the closed address', async () => {
    currentSearch = 'panel=page-2';
    let hasFlushed = false;
    const flushBeforeClose = mock(() => {
      hasFlushed = true;
      return Promise.resolve();
    });
    const { result } = renderHook(() => usePagesSidePanel(flushBeforeClose));

    await act(async () => {
      await result.current.closePanel();
    });

    expect(flushBeforeClose).toHaveBeenCalledTimes(1);
    expect(hasFlushed).toBe(true);
    expect(replace).toHaveBeenCalledWith(PATHNAME);
  });

  it('starts at the default width when nothing was chosen before', () => {
    const { result } = renderHook(() => usePagesSidePanel(() => Promise.resolve()));

    expect(result.current.width).toBe(PAGES_SIDE_PANEL_DEFAULT_WIDTH_PX);
  });

  it('picks up a width chosen in an earlier visit, clamped to what is still allowed', () => {
    localStorage.setItem(PAGES_SIDE_PANEL_WIDTH_STORAGE_KEY, JSON.stringify(5000));
    const { result } = renderHook(() => usePagesSidePanel(() => Promise.resolve()));

    expect(result.current.width).toBe(960);
  });

  it('clamps a width asked for directly, such as through the resize handle', () => {
    const { result } = renderHook(() => usePagesSidePanel(() => Promise.resolve()));

    act(() => {
      result.current.handleWidthChange(10);
    });

    expect(result.current.width).toBe(360);
  });
});
