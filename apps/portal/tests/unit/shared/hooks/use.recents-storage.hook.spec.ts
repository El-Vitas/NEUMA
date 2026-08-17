import { afterEach, describe, expect, it } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { RECENT_PAGES_MAX_ENTRIES, RECENT_PAGES_STORAGE_KEY } from '@/shared/constants/recents.constants';

const { useRecentPages } = await import('@/shared/hooks/use.recents-storage.hook');

describe('useRecentPages', () => {
  afterEach(() => {
    localStorage.removeItem(RECENT_PAGES_STORAGE_KEY);
  });

  it('starts without having loaded, then reads whatever was already stored', async () => {
    localStorage.setItem(
      RECENT_PAGES_STORAGE_KEY,
      JSON.stringify([
        { pageId: 'page-1', spaceId: 'space-1', spaceName: 'Engineering', title: 'Roadmap', visitedAt: 1 },
      ]),
    );

    const { result } = renderHook(() => useRecentPages());

    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.recentPages).toEqual([
      { pageId: 'page-1', spaceId: 'space-1', spaceName: 'Engineering', title: 'Roadmap', visitedAt: 1 },
    ]);
  });

  it('records a visit, persisting it and placing it first', async () => {
    const { result } = renderHook(() => useRecentPages());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    act(() => {
      result.current.recordVisit({ pageId: 'page-2', spaceId: 'space-2', spaceName: 'Design', title: 'Brand kit' });
    });

    await waitFor(() => expect(result.current.recentPages).toHaveLength(1));
    expect(result.current.recentPages[0]).toMatchObject({ pageId: 'page-2', title: 'Brand kit' });

    const stored = JSON.parse(localStorage.getItem(RECENT_PAGES_STORAGE_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
  });

  it('re-reads storage on demand instead of only at mount', async () => {
    const { result } = renderHook(() => useRecentPages());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    localStorage.setItem(
      RECENT_PAGES_STORAGE_KEY,
      JSON.stringify([{ pageId: 'page-3', spaceId: 'space-3', spaceName: 'Ops', title: 'Runbook', visitedAt: 5 }]),
    );

    act(() => {
      result.current.refresh();
    });

    await waitFor(() =>
      expect(result.current.recentPages).toEqual([
        { pageId: 'page-3', spaceId: 'space-3', spaceName: 'Ops', title: 'Runbook', visitedAt: 5 },
      ]),
    );
  });

  it('never keeps more than the configured number of entries', async () => {
    const { result } = renderHook(() => useRecentPages());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    for (let index = 0; index < RECENT_PAGES_MAX_ENTRIES + 3; index += 1) {
      act(() => {
        result.current.recordVisit({
          pageId: `page-${String(index)}`,
          spaceId: 'space-1',
          spaceName: 'Engineering',
          title: `Page ${String(index)}`,
        });
      });
    }

    await waitFor(() => expect(result.current.recentPages).toHaveLength(RECENT_PAGES_MAX_ENTRIES));
  });
});
