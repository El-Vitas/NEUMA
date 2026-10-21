import { describe, expect, test } from 'bun:test';
import {
  layoutPageCalendarLanes,
  listPageCalendarDays,
  listPageCalendarWeekDays,
  readPageCalendarMonth,
  shiftPageCalendarDate,
  shiftPageCalendarMonth,
} from './page-view.calendar.lib.js';

describe('calendar months', () => {
  test('a month is read from what names it', () => {
    expect(readPageCalendarMonth('2026-09')).toBe('2026-09');
  });

  test('anything that does not name a month is no month at all', () => {
    expect(readPageCalendarMonth('2026-13')).toBeNull();
    expect(readPageCalendarMonth('mañana')).toBeNull();
    expect(readPageCalendarMonth('')).toBeNull();
  });

  test('the month before january is december of the year before', () => {
    expect(shiftPageCalendarMonth('2026-01', -1)).toBe('2025-12');
  });

  test('the month after december is january of the year after', () => {
    expect(shiftPageCalendarMonth('2026-12', 1)).toBe('2027-01');
  });
});

describe('moving a day at a time', () => {
  test('goes to the next day and to the one before', () => {
    expect(shiftPageCalendarDate('2026-09-14', 1)).toBe('2026-09-15');
    expect(shiftPageCalendarDate('2026-09-14', -1)).toBe('2026-09-13');
  });

  test('crosses the end of a month and of a year', () => {
    expect(shiftPageCalendarDate('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftPageCalendarDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftPageCalendarDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('jumps a whole week', () => {
    expect(shiftPageCalendarDate('2026-09-14', 7)).toBe('2026-09-21');
  });
});

describe('the days a month is drawn with', () => {
  test('always draws six whole weeks', () => {
    expect(listPageCalendarDays('2026-09')).toHaveLength(42);
    expect(listPageCalendarDays('2026-02')).toHaveLength(42);
  });

  test('starts on the monday of the week the first day falls in', () => {
    // 2026-09-01 is a Tuesday, so the grid opens on Monday 2026-08-31.
    expect(listPageCalendarDays('2026-09')[0]).toEqual({ date: '2026-08-31', isOfTheMonth: false });
  });

  test('says which days belong to the month being looked at', () => {
    const days = listPageCalendarDays('2026-09');

    expect(days.filter((day) => day.isOfTheMonth)).toHaveLength(30);
    expect(days.find((day) => day.date === '2026-09-01')?.isOfTheMonth).toBe(true);
    expect(days.find((day) => day.date === '2026-10-01')?.isOfTheMonth).toBe(false);
  });

  test('runs day by day without repeating or skipping any', () => {
    const days = listPageCalendarDays('2026-03').map((day) => day.date);

    expect(new Set(days).size).toBe(days.length);
    // March 2026 opens on a Sunday, so the grid starts the Monday before.
    expect(days[0]).toBe('2026-02-23');
    expect(days.at(-1)).toBe('2026-04-05');
  });
});

describe('the days a week is drawn with', () => {
  test('are the seven days from the monday to the sunday that hold the day asked', () => {
    expect(listPageCalendarWeekDays('2026-09-16')).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ]);
  });

  test('a sunday belongs to the week that ends on it', () => {
    expect(listPageCalendarWeekDays('2026-09-20')[0]).toBe('2026-09-14');
  });

  test('a monday opens its own week', () => {
    expect(listPageCalendarWeekDays('2026-09-14')[0]).toBe('2026-09-14');
  });
});

describe('where the entries of a week lie side by side', () => {
  const week = listPageCalendarWeekDays('2026-09-16');

  test('an entry of one day takes one column', () => {
    expect(layoutPageCalendarLanes(week, [{ end: '2026-09-16', id: 'a', start: '2026-09-16' }])).toEqual([
      { endColumn: 2, endsInWeek: true, id: 'a', lane: 0, startColumn: 2, startsInWeek: true },
    ]);
  });

  test('an entry that spans days takes a column for each of them, in the same lane', () => {
    expect(layoutPageCalendarLanes(week, [{ end: '2026-09-18', id: 'a', start: '2026-09-15' }])).toEqual([
      { endColumn: 4, endsInWeek: true, id: 'a', lane: 0, startColumn: 1, startsInWeek: true },
    ]);
  });

  test('is cut at the edges of the week and says that it goes on', () => {
    expect(layoutPageCalendarLanes(week, [{ end: '2026-09-30', id: 'a', start: '2026-09-10' }])).toEqual([
      { endColumn: 6, endsInWeek: false, id: 'a', lane: 0, startColumn: 0, startsInWeek: false },
    ]);
  });

  test('leaves out what does not touch the week', () => {
    expect(layoutPageCalendarLanes(week, [{ end: '2026-09-13', id: 'a', start: '2026-09-01' }])).toEqual([]);
    expect(layoutPageCalendarLanes(week, [{ end: '2026-09-30', id: 'b', start: '2026-09-21' }])).toEqual([]);
  });

  test('entries that share a day go in different lanes, and one that fits an earlier lane takes it', () => {
    const lanes = layoutPageCalendarLanes(week, [
      { end: '2026-09-17', id: 'long', start: '2026-09-14' },
      { end: '2026-09-15', id: 'overlapping', start: '2026-09-15' },
      { end: '2026-09-19', id: 'after', start: '2026-09-18' },
    ]);

    expect(lanes.map((lane) => [lane.id, lane.lane])).toEqual([
      ['long', 0],
      ['overlapping', 1],
      ['after', 0],
    ]);
  });
});
