import {
  LOCAL_CACHE_EVICTION_TARGET_SHARE,
  LOCAL_CACHE_MAXIMUM_BYTES,
  LOCAL_CACHE_QUOTA_SHARE,
} from '../constants/local-cache.constants';
import type { CacheEntryUsage } from '../types/local-cache.types';

/** The smaller of the fixed cap and a share of the browser quota; zero when the quota is unknown. */
export const computeCacheBudgetBytes = (quotaBytes: null | number): number =>
  quotaBytes === null ? 0 : Math.min(LOCAL_CACHE_MAXIMUM_BYTES, Math.floor(quotaBytes * LOCAL_CACHE_QUOTA_SHARE));

const sumBytes = (entries: readonly CacheEntryUsage[]): number =>
  entries.reduce((total, entry) => total + entry.bytes, 0);

/** Keys to drop, least recently used first, once the entries pass the budget; enough to land at 80 percent of it. */
export const planEviction = (
  entries: readonly CacheEntryUsage[],
  budgetBytes: number,
  protectedKeys: ReadonlySet<string> = new Set(),
): readonly string[] => {
  let remaining = sumBytes(entries);
  if (remaining <= budgetBytes) return [];
  const target = budgetBytes * LOCAL_CACHE_EVICTION_TARGET_SHARE;
  const candidates = entries
    .filter((entry) => !protectedKeys.has(entry.key))
    .toSorted((a, b) => a.lastAccessAt - b.lastAccessAt);
  const evicted: string[] = [];
  for (const entry of candidates) {
    if (remaining <= target) break;
    evicted.push(entry.key);
    remaining -= entry.bytes;
  }
  return evicted;
};
