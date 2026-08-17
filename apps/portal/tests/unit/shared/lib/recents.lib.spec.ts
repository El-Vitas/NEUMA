import { describe, expect, it } from 'bun:test';
import { parseStoredRecentPages, withRecordedVisit } from '@/shared/lib/recents.lib';
import type { RecentPageEntry } from '@/shared/types/recents.types';

const entry = (overrides: Partial<RecentPageEntry> = {}): RecentPageEntry => ({
  pageId: 'page-1',
  spaceId: 'space-1',
  spaceName: 'Engineering',
  title: 'Onboarding',
  visitedAt: 1,
  ...overrides,
});

describe('parseStoredRecentPages', () => {
  it('returns an empty list when nothing was stored', () => {
    expect(parseStoredRecentPages(null)).toEqual([]);
  });

  it('returns an empty list when the stored value is not valid JSON', () => {
    expect(parseStoredRecentPages('{not json')).toEqual([]);
  });

  it('returns an empty list when the stored value does not match the shape', () => {
    expect(parseStoredRecentPages(JSON.stringify([{ pageId: 'page-1' }]))).toEqual([]);
  });

  it('parses a previously stored list of visited pages', () => {
    const stored = [entry()];
    expect(parseStoredRecentPages(JSON.stringify(stored))).toEqual(stored);
  });
});

describe('withRecordedVisit', () => {
  it('places the newest visit first', () => {
    const existing = [entry({ pageId: 'page-1', visitedAt: 1 })];
    const visit = entry({ pageId: 'page-2', visitedAt: 2 });

    expect(withRecordedVisit(existing, visit, 10)).toEqual([visit, existing[0]]);
  });

  it('never lists the same page twice', () => {
    const existing = [entry({ pageId: 'page-1', title: 'Old title', visitedAt: 1 })];
    const visit = entry({ pageId: 'page-1', title: 'New title', visitedAt: 2 });

    expect(withRecordedVisit(existing, visit, 10)).toEqual([visit]);
  });

  it('keeps at most the requested number of entries', () => {
    const existing = [entry({ pageId: 'page-1' }), entry({ pageId: 'page-2' })];
    const visit = entry({ pageId: 'page-3' });

    expect(withRecordedVisit(existing, visit, 2)).toHaveLength(2);
  });
});
