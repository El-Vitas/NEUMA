import { describe, expect, it } from 'bun:test';
import { buildTableEmptyMessage, getAriaSort } from '@/shared/lib/data-table.lib';

describe('buildTableEmptyMessage', () => {
  it('returns undefined when the table is not empty', () => {
    expect(buildTableEmptyMessage(false, false, 'filtered', 'empty')).toBeUndefined();
    expect(buildTableEmptyMessage(false, true, 'filtered', 'empty')).toBeUndefined();
  });

  it('returns the filtered message when empty with active filter', () => {
    expect(buildTableEmptyMessage(true, true, 'filtered', 'empty')).toBe('filtered');
  });

  it('returns the empty message when empty without filter', () => {
    expect(buildTableEmptyMessage(true, false, 'filtered', 'empty')).toBe('empty');
  });
});

describe('getAriaSort', () => {
  it('maps asc to ascending', () => {
    expect(getAriaSort('asc')).toBe('ascending');
  });

  it('maps desc to descending', () => {
    expect(getAriaSort('desc')).toBe('descending');
  });

  it('maps false to none', () => {
    expect(getAriaSort(false)).toBe('none');
  });
});
