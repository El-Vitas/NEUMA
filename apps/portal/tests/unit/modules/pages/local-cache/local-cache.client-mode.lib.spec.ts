import { describe, expect, it } from 'bun:test';
import { decideClientMode } from '@/modules/pages/local-cache/lib/local-cache.client-mode.lib';
import type { ClientModeInput } from '@/modules/pages/local-cache/types/local-cache.types';

const baseInput: ClientModeInput = {
  estimatedBytes: 1_000_000,
  filterPropertyKeys: ['status'],
  groupPropertyKey: 'status',
  hasSearch: false,
  properties: [
    { key: 'status', type: 'STATUS' },
    { key: 'points', type: 'NUMBER' },
    { key: 'parent', type: 'RELATION' },
    { key: 'total', type: 'ROLLUP' },
    { key: 'score', type: 'FORMULA' },
  ],
  sortPropertyKeys: ['points'],
  visibleRowCount: 4000,
};

describe('decideClientMode', () => {
  it('uses the client for a small collection that needs nothing from the server', () => {
    expect(decideClientMode(baseInput)).toEqual({ isClientMode: true });
  });

  it('accepts exactly 10,000 visible rows and refuses one more', () => {
    expect(decideClientMode({ ...baseInput, visibleRowCount: 10_000 }).isClientMode).toBe(true);
    expect(decideClientMode({ ...baseInput, visibleRowCount: 10_001 })).toEqual({
      isClientMode: false,
      reason: 'too-many-rows',
    });
  });

  it('refuses a payload above 6 MB even when the row count fits', () => {
    expect(decideClientMode({ ...baseInput, estimatedBytes: 6_000_001 })).toEqual({
      isClientMode: false,
      reason: 'too-heavy',
    });
  });

  it('refuses while the view is being searched', () => {
    expect(decideClientMode({ ...baseInput, hasSearch: true })).toEqual({ isClientMode: false, reason: 'search' });
  });

  it.each(['parent', 'total', 'score'])('refuses when %s is in the filter', (key) => {
    expect(decideClientMode({ ...baseInput, filterPropertyKeys: [key] })).toEqual({
      isClientMode: false,
      reason: 'server-only-property',
    });
  });

  it.each(['parent', 'total', 'score'])('refuses when %s is in the sort', (key) => {
    expect(decideClientMode({ ...baseInput, sortPropertyKeys: [key] }).isClientMode).toBe(false);
  });

  it.each(['parent', 'total', 'score'])('refuses when %s is the grouping', (key) => {
    expect(decideClientMode({ ...baseInput, groupPropertyKey: key }).isClientMode).toBe(false);
  });

  it('accepts a view with no grouping', () => {
    expect(decideClientMode({ ...baseInput, groupPropertyKey: null }).isClientMode).toBe(true);
  });
});
