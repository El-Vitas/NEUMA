import { describe, expect, it } from 'bun:test';
import { listPageCalendarDays, listPageCalendarWeekDays } from '@neuma/shared';
import { buildCalendarCells } from '@/modules/pages/collections/lib/pages.calendar.lib';
import type { PageRow } from '@/modules/pages/collections/types/pages.schema.types';

const rowOf = (id: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection-1',
  propertyValues: {},
  spaceId: 'space-1',
  title: id,
});

const periods: Record<string, { end: string; start: string }> = {
  long: { end: '2026-09-17', start: '2026-09-14' },
  one: { end: '2026-09-15', start: '2026-09-15' },
  across: { end: '2026-09-23', start: '2026-09-19' },
  nothing: { end: '2026-09-15', start: '2026-09-15' },
};

const periodOf = (row: PageRow) => (row.id === 'nothing' ? null : (periods[row.id] ?? null));

const week = listPageCalendarWeekDays('2026-09-16').map((date) => ({ date, isOfTheMonth: true }));

const cellOf = (cells: ReturnType<typeof buildCalendarCells>, date: string) => cells.find((cell) => cell.date === date);

describe('the entries a calendar draws on each day', () => {
  it('puts an entry that lasts several days on every day it lasts, in the same slot', () => {
    const cells = buildCalendarCells(week, [rowOf('long')], periodOf);

    const slots = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'].map(
      (date) => cellOf(cells, date)?.slots[0]?.row.id,
    );
    expect(slots).toEqual(['long', 'long', 'long', 'long']);
    expect(cellOf(cells, '2026-09-18')?.slots[0]).toBeNull();
  });

  it('says on which days the entry starts and ends, and where its title goes', () => {
    const cells = buildCalendarCells(week, [rowOf('long')], periodOf);

    expect(cellOf(cells, '2026-09-14')?.slots[0]).toMatchObject({
      isFirstDay: true,
      isLastDay: false,
      showsTitle: true,
    });
    expect(cellOf(cells, '2026-09-15')?.slots[0]).toMatchObject({
      isFirstDay: false,
      isLastDay: false,
      showsTitle: false,
    });
    expect(cellOf(cells, '2026-09-17')?.slots[0]).toMatchObject({
      isFirstDay: false,
      isLastDay: true,
      showsTitle: false,
    });
  });

  it('says how many days into the entry each day is, so it can be grabbed by any of them', () => {
    const cells = buildCalendarCells(week, [rowOf('long')], periodOf);

    expect(
      ['2026-09-14', '2026-09-15', '2026-09-17'].map((date) => cellOf(cells, date)?.slots[0]?.daysIntoEntry),
    ).toEqual([0, 1, 3]);
  });

  it('puts entries that share a day in different slots, so none covers another', () => {
    const cells = buildCalendarCells(week, [rowOf('long'), rowOf('one')], periodOf);

    const shared = cellOf(cells, '2026-09-15');
    expect(shared?.slots.map((slot) => slot?.row.id)).toEqual(['long', 'one']);
  });

  it('leaves a slot empty on the days where the entry above it is not, so entries line up across the week', () => {
    const cells = buildCalendarCells(week, [rowOf('long'), rowOf('one')], periodOf);

    expect(cellOf(cells, '2026-09-14')?.slots.map((slot) => slot?.row.id ?? null)).toEqual(['long', null]);
    expect(cellOf(cells, '2026-09-16')?.slots.map((slot) => slot?.row.id ?? null)).toEqual(['long', null]);
  });

  it('draws the title again where an entry starts a new week of the grid, and says it began before', () => {
    const days = listPageCalendarDays('2026-09');
    const cells = buildCalendarCells(days, [rowOf('across')], periodOf);

    expect(cellOf(cells, '2026-09-19')?.slots[0]).toMatchObject({ isFirstDay: true, showsTitle: true });
    expect(cellOf(cells, '2026-09-21')?.slots[0]).toMatchObject({ isFirstDay: false, showsTitle: true });
    expect(cellOf(cells, '2026-09-22')?.slots[0]).toMatchObject({ showsTitle: false });
    expect(cellOf(cells, '2026-09-23')?.slots[0]).toMatchObject({ isLastDay: true });
  });

  it('leaves out the rows that have no place in time', () => {
    const cells = buildCalendarCells(week, [rowOf('nothing')], periodOf);

    expect(cells.every((cell) => cell.slots.length === 0)).toBe(true);
  });

  it('keeps every day of the grid, drawn or not', () => {
    const cells = buildCalendarCells(listPageCalendarDays('2026-09'), [], periodOf);

    expect(cells).toHaveLength(42);
  });
});
