import { describe, expect, test } from 'bun:test';
import {
  addPageDays,
  isValidPageTimeZone,
  readPageLocalDay,
  readPageWeekday,
  readPageZonedDayStart,
} from './page-view.zone.lib.js';

describe('time zones', () => {
  test('accepts the names of real zones and refuses the rest', () => {
    expect(isValidPageTimeZone('America/Santiago')).toBe(true);
    expect(isValidPageTimeZone('UTC')).toBe(true);
    expect(isValidPageTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidPageTimeZone('')).toBe(false);
  });

  test('reads the day an instant falls on in a zone', () => {
    const instant = Date.parse('2026-10-21T02:30:00Z');

    expect(readPageLocalDay(instant, 'UTC')).toBe('2026-10-21');
    expect(readPageLocalDay(instant, 'America/Santiago')).toBe('2026-10-20');
    expect(readPageLocalDay(instant, 'Pacific/Kiritimati')).toBe('2026-10-21');
    expect(readPageLocalDay(instant, 'Pacific/Pago_Pago')).toBe('2026-10-20');
  });

  test('finds the instant a day starts in a zone, with or without daylight saving', () => {
    expect(new Date(readPageZonedDayStart('2026-10-20', 'UTC')).toISOString()).toBe('2026-10-20T00:00:00.000Z');
    expect(new Date(readPageZonedDayStart('2026-10-20', 'America/Santiago')).toISOString()).toBe(
      '2026-10-20T03:00:00.000Z',
    );
    expect(new Date(readPageZonedDayStart('2026-06-20', 'America/Santiago')).toISOString()).toBe(
      '2026-06-20T04:00:00.000Z',
    );
  });

  test('starts a day whose midnight does not exist at its first instant', () => {
    const start = readPageZonedDayStart('2026-09-06', 'America/Santiago');

    expect(readPageLocalDay(start, 'America/Santiago')).toBe('2026-09-06');
    expect(readPageLocalDay(start - 1, 'America/Santiago')).toBe('2026-09-05');
  });

  test('adds days to a day and names the weekday', () => {
    expect(addPageDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addPageDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(readPageWeekday('2026-10-19')).toBe(1);
    expect(readPageWeekday('2026-10-25')).toBe(0);
  });
});
