import { describe, expect, it } from 'bun:test';
import {
  clampTableColumnWidth,
  isTableColumnFrozen,
  listTableColumnKeys,
  readTableColumnOffsets,
  readTableColumnWidth,
} from '@/modules/pages/collections/lib/pages.table-columns.lib';

describe('listTableColumnKeys', () => {
  it('puts the name first, because that is the column that opens the row', () => {
    expect(listTableColumnKeys(['status', 'dueDate'])).toEqual(['title', 'status', 'dueDate']);
  });
});

describe('readTableColumnWidth', () => {
  it('uses the width somebody gave it', () => {
    expect(readTableColumnWidth({ status: 240 }, 'status')).toBe(240);
  });

  it('gives the name column more room than the rest, because it is the one being read', () => {
    expect(readTableColumnWidth({}, 'title')).toBeGreaterThan(readTableColumnWidth({}, 'status'));
  });
});

describe('clampTableColumnWidth', () => {
  it('refuses a width nobody could read, and one that would not fit', () => {
    expect(clampTableColumnWidth(10)).toBe(80);
    expect(clampTableColumnWidth(5000)).toBe(960);
    expect(clampTableColumnWidth(240.4)).toBe(240);
  });
});

describe('readTableColumnOffsets', () => {
  it('says where each column starts, which is what a column that stays put needs to know', () => {
    const offsets = readTableColumnOffsets(['title', 'status', 'dueDate'], { status: 100, title: 200 });

    expect(offsets).toEqual([0, 200, 300]);
  });
});

describe('isTableColumnFrozen', () => {
  it('counts the name column as the first one that stays put', () => {
    expect(isTableColumnFrozen(0, 1)).toBe(true);
    expect(isTableColumnFrozen(1, 1)).toBe(false);
    expect(isTableColumnFrozen(1, 2)).toBe(true);
    expect(isTableColumnFrozen(0, 0)).toBe(false);
  });
});
