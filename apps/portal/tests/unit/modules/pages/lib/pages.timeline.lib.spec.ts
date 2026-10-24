import { describe, expect, it } from 'bun:test';
import type { PageFilter, PagePropertyValues } from '@neuma/shared';
import { matchesPageFilter, readPageTimelineWindow } from '@neuma/shared';
import {
  buildTimelineEntries,
  buildTimelineWindowFilters,
  previewTimelinePeriod,
  readRowPeriod,
  readTimelineDragDays,
  resolveTimelineDay,
} from '@/modules/pages/collections/lib/pages.timeline.lib';
import type { PageRow } from '@/modules/pages/collections/types/pages.schema.types';

const properties = [
  { key: 'begin', options: null, type: 'DATE' as const },
  { key: 'due', options: null, type: 'DATE' as const },
];

const window = { end: '2026-09-30', start: '2026-09-01' };

const rowOf = (id: string, propertyValues: PagePropertyValues): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues,
  spaceId: 'space-1',
  title: id,
});

const anyMatches = (filters: readonly PageFilter[], values: PagePropertyValues): boolean =>
  filters.some((filter) => matchesPageFilter(filter, values, properties));

const depthOf = (filter: PageFilter): number =>
  filter.kind === 'CONDITION' ? 1 : 1 + Math.max(0, ...filter.conditions.map(depthOf));

describe('what a timeline asks the server for, with one date property', () => {
  const filters = buildTimelineWindowFilters('begin', null, window);

  it('is a single question: the rows whose dates overlap the window', () => {
    expect(filters).toHaveLength(1);
    expect(filters[0]).toEqual({
      kind: 'CONDITION',
      operator: 'IS',
      propertyKey: 'begin',
      value: { end: '2026-09-30', start: '2026-09-01' },
    });
  });

  it('keeps a range that starts before the window and ends inside it, and one that covers it', () => {
    expect(anyMatches(filters, { begin: { end: '2026-09-05', start: '2026-08-20' } })).toBe(true);
    expect(anyMatches(filters, { begin: { end: '2026-12-05', start: '2026-08-20' } })).toBe(true);
  });

  it('leaves out what lies wholly outside it', () => {
    expect(anyMatches(filters, { begin: { start: '2026-08-31' } })).toBe(false);
    expect(anyMatches(filters, { begin: { start: '2026-10-01' } })).toBe(false);
  });
});

describe('what a timeline asks the server for, with the end in another property', () => {
  const filters = buildTimelineWindowFilters('begin', 'due', window);

  it('keeps a row that starts before the window and ends after it, which neither date shows', () => {
    expect(anyMatches(filters, { begin: { start: '2026-08-01' }, due: { start: '2026-10-31' } })).toBe(true);
  });

  it('keeps a row that starts or ends inside the window', () => {
    expect(anyMatches(filters, { begin: { start: '2026-09-10' }, due: { start: '2026-10-31' } })).toBe(true);
    expect(anyMatches(filters, { begin: { start: '2026-08-01' }, due: { start: '2026-09-10' } })).toBe(true);
  });

  it('keeps a row that has a start and no end, which lasts the day it starts', () => {
    expect(anyMatches(filters, { begin: { start: '2026-09-10' } })).toBe(true);
  });

  it('leaves out a row that ends before the window or starts after it, and a row with no start', () => {
    expect(anyMatches(filters, { begin: { start: '2026-07-01' }, due: { start: '2026-08-31' } })).toBe(false);
    expect(anyMatches(filters, { begin: { start: '2026-10-01' }, due: { start: '2026-10-31' } })).toBe(false);
    expect(anyMatches(filters, { due: { start: '2026-09-10' } })).toBe(false);
    expect(anyMatches(filters, { begin: { start: '2026-08-10' } })).toBe(false);
  });

  it('is made of questions no deeper than two levels, so any filter of the person can be added to them', () => {
    expect(filters.every((filter) => depthOf(filter) <= 2)).toBe(true);
  });
});

describe('where a row sits in time', () => {
  it('reads the days from the one date property of the row', () => {
    const row = rowOf('a', { begin: { end: '2026-09-05', start: '2026-09-03' } });

    expect(readRowPeriod(row, 'begin', null)).toEqual({ end: '2026-09-05', start: '2026-09-03' });
  });

  it('reads the end from the other property when the view names one', () => {
    const row = rowOf('a', { begin: { start: '2026-09-03' }, due: { start: '2026-09-09' } });

    expect(readRowPeriod(row, 'begin', 'due')).toEqual({ end: '2026-09-09', start: '2026-09-03' });
  });

  it('is nowhere for a row without a start', () => {
    expect(readRowPeriod(rowOf('a', {}), 'begin', null)).toBeNull();
  });
});

describe('the bars of a timeline', () => {
  const periods: Record<string, { end: string; start: string } | null> = {
    early: { end: '2026-09-02', start: '2026-09-01' },
    late: { end: '2026-09-20', start: '2026-09-15' },
    outside: { end: '2026-10-20', start: '2026-10-15' },
    none: null,
    same: { end: '2026-09-02', start: '2026-09-01' },
  };
  const rows = ['late', 'early', 'outside', 'none', 'same'].map((id) => rowOf(id, {}));

  it('go in the order of the days the rows start, then end, then by id', () => {
    const entries = buildTimelineEntries(rows, (row) => periods[row.id] ?? null, window, 10);

    expect(entries.map((entry) => entry.row.id)).toEqual(['early', 'same', 'late']);
  });

  it('are drawn from the start of the row and as wide as it lasts', () => {
    const entries = buildTimelineEntries(rows, (row) => periods[row.id] ?? null, window, 10);

    expect(entries.map((entry) => [entry.bar.left, entry.bar.width])).toEqual([
      [0, 20],
      [0, 20],
      [140, 60],
    ]);
  });

  it('leave out the rows that lie outside the window and the rows with no days', () => {
    const entries = buildTimelineEntries(rows, (row) => periods[row.id] ?? null, window, 10);

    expect(entries.some((entry) => entry.row.id === 'outside' || entry.row.id === 'none')).toBe(false);
  });

  it('are laid out for two thousand rows in a blink', () => {
    const many = Array.from({ length: 2000 }, (_unused, position) => rowOf(`row-${String(position)}`, {}));
    const periodOf = (row: PageRow) => {
      const position = Number(row.id.slice('row-'.length));
      const day = String((position % 20) + 8).padStart(2, '0');
      return { end: `2026-09-${day}`, start: `2026-09-${day}` };
    };
    const started = performance.now();

    const entries = buildTimelineEntries(many, periodOf, readPageTimelineWindow('DAY', '2026-09-16'), 40);

    expect(entries).toHaveLength(2000);
    expect(performance.now() - started).toBeLessThan(100);
  });
});

describe('the bar while it is dragged', () => {
  const period = { end: '2026-09-18', start: '2026-09-14' };

  it('moves whole with the pointer', () => {
    expect(previewTimelinePeriod(period, 'MOVE', 3)).toEqual({ end: '2026-09-21', start: '2026-09-17' });
    expect(previewTimelinePeriod(period, 'MOVE', -2)).toEqual({ end: '2026-09-16', start: '2026-09-12' });
  });

  it('stretches from one end only', () => {
    expect(previewTimelinePeriod(period, 'RESIZE_END', 2)).toEqual({ end: '2026-09-20', start: '2026-09-14' });
    expect(previewTimelinePeriod(period, 'RESIZE_START', -2)).toEqual({ end: '2026-09-18', start: '2026-09-12' });
  });

  it('never lets one end cross the other', () => {
    expect(previewTimelinePeriod(period, 'RESIZE_END', -30)).toEqual({ end: '2026-09-14', start: '2026-09-14' });
    expect(previewTimelinePeriod(period, 'RESIZE_START', 30)).toEqual({ end: '2026-09-18', start: '2026-09-18' });
  });

  it('turns the distance the pointer went into whole days, to the nearest one', () => {
    expect(readTimelineDragDays(100, 100, 40)).toBe(0);
    expect(readTimelineDragDays(100, 119, 40)).toBe(0);
    expect(readTimelineDragDays(100, 121, 40)).toBe(1);
    expect(readTimelineDragDays(100, 20, 40)).toBe(-2);
  });
});

describe('the day a timeline opens on', () => {
  it('is the day asked for when it is a real day', () => {
    expect(resolveTimelineDay('2026-09-16', '2026-10-21')).toBe('2026-09-16');
  });

  it('is today when nothing was asked or what was asked is not a day', () => {
    expect(resolveTimelineDay(null, '2026-10-21')).toBe('2026-10-21');
    expect(resolveTimelineDay('2026-13-45', '2026-10-21')).toBe('2026-10-21');
    expect(resolveTimelineDay('ayer', '2026-10-21')).toBe('2026-10-21');
  });
});
