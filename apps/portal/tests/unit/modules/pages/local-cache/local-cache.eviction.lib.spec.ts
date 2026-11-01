import { describe, expect, it } from 'bun:test';
import { computeCacheBudgetBytes, planEviction } from '@/modules/pages/local-cache/lib/local-cache.eviction.lib';
import type { CacheEntryUsage } from '@/modules/pages/local-cache/types/local-cache.types';

const MEGABYTE = 1_048_576;

const entry = (key: string, bytes: number, lastAccessAt: number): CacheEntryUsage => ({ bytes, key, lastAccessAt });

describe('computeCacheBudgetBytes', () => {
  it('is the smaller of 50 MB and a tenth of the quota', () => {
    expect(computeCacheBudgetBytes(1000 * MEGABYTE)).toBe(50 * MEGABYTE);
    expect(computeCacheBudgetBytes(100 * MEGABYTE)).toBe(10 * MEGABYTE);
  });

  it('is zero when the quota is unknown', () => {
    expect(computeCacheBudgetBytes(null)).toBe(0);
  });
});

describe('planEviction', () => {
  it('evicts nothing while the entries fit', () => {
    expect(planEviction([entry('a', 10, 1), entry('b', 10, 2)], 100)).toEqual([]);
  });

  it('evicts the least recently used down to 80 percent of the budget', () => {
    const entries = [entry('new', 50, 30), entry('old', 50, 10), entry('mid', 50, 20)];
    expect(planEviction(entries, 100)).toEqual(['old', 'mid']);
  });

  it('keeps entries the caller protects', () => {
    const entries = [entry('open', 90, 1), entry('other', 40, 2)];
    expect(planEviction(entries, 100, new Set(['open']))).toEqual(['other']);
  });
});
