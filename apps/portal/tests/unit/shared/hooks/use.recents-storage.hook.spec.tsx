import { afterEach, describe, expect, it } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { RecentsOwnerProvider } from '@/shared/components/portal/recents-owner.provider';
import { RECENT_PAGES_MAX_ENTRIES } from '@/shared/constants/recents.constants';
import { buildRecentPagesStorageKey, clearRecentPages } from '@/shared/lib/recents.lib';

const { useRecentPages } = await import('@/shared/hooks/use.recents-storage.hook');

const ownKey = buildRecentPagesStorageKey('user-1');
const otherKey = buildRecentPagesStorageKey('user-2');
const roadmap = { pageId: 'page-1', spaceId: 'space-1', spaceName: 'Engineering', title: 'Roadmap', visitedAt: 1 };

const UserOne = ({ children }: { readonly children: ReactNode }) => (
  <RecentsOwnerProvider userId="user-1">{children}</RecentsOwnerProvider>
);

const renderAsUserOne = () => renderHook(() => useRecentPages(), { wrapper: UserOne });

describe('useRecentPages', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('starts without having loaded, then reads whatever the person already had', async () => {
    localStorage.setItem(ownKey, JSON.stringify([roadmap]));

    const { result } = renderAsUserOne();

    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.recentPages).toEqual([roadmap]);
  });

  it('removes the lists of other people when it loads', async () => {
    localStorage.setItem(otherKey, JSON.stringify([roadmap]));
    localStorage.setItem(ownKey, JSON.stringify([roadmap]));

    const { result } = renderAsUserOne();

    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(localStorage.getItem(otherKey)).toBeNull();
    expect(localStorage.getItem(ownKey)).not.toBeNull();
  });

  it('keeps nothing without a signed-in owner', async () => {
    const { result } = renderHook(() => useRecentPages());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    act(() => {
      result.current.recordVisit({ pageId: 'page-2', spaceId: 'space-2', spaceName: 'Design', title: 'Brand kit' });
    });

    expect(result.current.recentPages).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it('records a visit under the person, placing it first', async () => {
    const { result } = renderAsUserOne();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    act(() => {
      result.current.recordVisit({ pageId: 'page-2', spaceId: 'space-2', spaceName: 'Design', title: 'Brand kit' });
    });

    await waitFor(() => expect(result.current.recentPages).toHaveLength(1));
    expect(result.current.recentPages[0]).toMatchObject({ pageId: 'page-2', title: 'Brand kit' });
    expect(JSON.parse(localStorage.getItem(ownKey) ?? '[]')).toHaveLength(1);
  });

  it('re-reads storage on demand instead of only at mount', async () => {
    const { result } = renderAsUserOne();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    localStorage.setItem(ownKey, JSON.stringify([roadmap]));
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.recentPages).toEqual([roadmap]));
  });

  it('keeps working when the browser refuses its storage', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    });

    try {
      const { result } = renderAsUserOne();
      await waitFor(() => expect(result.current.hasLoaded).toBe(true));
      act(() => {
        result.current.recordVisit({ pageId: 'page-9', spaceId: 'space-1', spaceName: 'Eng', title: 'Notes' });
      });

      expect(result.current.recentPages).toHaveLength(1);
    } finally {
      if (original !== undefined) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });

  it('forgets a person visits when asked to clear', () => {
    localStorage.setItem(ownKey, '[]');
    localStorage.setItem(otherKey, '[]');

    clearRecentPages('user-1');

    expect(localStorage.getItem(ownKey)).toBeNull();
    expect(localStorage.getItem(otherKey)).not.toBeNull();
  });

  it('never keeps more than the configured number of entries', async () => {
    const { result } = renderAsUserOne();
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
