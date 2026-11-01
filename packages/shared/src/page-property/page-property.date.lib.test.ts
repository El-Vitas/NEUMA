import { describe, expect, test } from 'bun:test';
import {
  formatPageDate,
  getPageDateEndTime,
  getPageDateStartTime,
  isPageDateValue,
  isValidPageDateValue,
  pageDateContainsTime,
  readPageDateValue,
} from './page-property.date.lib.js';

describe('isValidPageDateValue', () => {
  test('accepts a single day', () => {
    expect(isValidPageDateValue({ start: '2026-10-20' })).toBe(true);
  });

  test('accepts a range whose end is not before its start', () => {
    expect(isValidPageDateValue({ end: '2026-10-25', start: '2026-10-20' })).toBe(true);
    expect(isValidPageDateValue({ end: '2026-10-20', start: '2026-10-20' })).toBe(true);
    expect(isValidPageDateValue({ end: '2026-10-19', start: '2026-10-20' })).toBe(false);
  });

  test('accepts an instant with an offset', () => {
    expect(isValidPageDateValue({ start: '2026-10-20T09:00:00-03:00' })).toBe(true);
    expect(isValidPageDateValue({ start: '2026-10-20T09:00:00Z' })).toBe(true);
  });

  test('requires both ends to have the same precision', () => {
    expect(isValidPageDateValue({ end: '2026-10-21T09:00:00Z', start: '2026-10-20' })).toBe(false);
  });

  test('refuses what is not a real date', () => {
    expect(isValidPageDateValue({ start: '2026-02-30' })).toBe(false);
    expect(isValidPageDateValue({ start: 'next week' })).toBe(false);
    expect(isValidPageDateValue({ start: '' })).toBe(false);
  });

  test('refuses an instant without an offset because it names no moment', () => {
    expect(isValidPageDateValue({ start: '2026-10-20T09:00:00' })).toBe(false);
  });
});

describe('readPageDateValue', () => {
  test('reads a stored date', () => {
    expect(readPageDateValue({ start: '2026-10-20' })).toEqual({ start: '2026-10-20' });
    expect(readPageDateValue({ end: '2026-10-25', start: '2026-10-20' })).toEqual({
      end: '2026-10-25',
      start: '2026-10-20',
    });
  });

  test('reads nothing from a value that is not a date', () => {
    expect(readPageDateValue('2026-10-20')).toBeNull();
    expect(readPageDateValue({ end: 3 })).toBeNull();
    expect(readPageDateValue(null)).toBeNull();
  });
});

describe('isPageDateValue', () => {
  test('tells a date from the other values', () => {
    expect(isPageDateValue({ start: '2026-10-20' })).toBe(true);
    expect(isPageDateValue('2026-10-20')).toBe(false);
    expect(isPageDateValue(['a'])).toBe(false);
  });
});

describe('date times', () => {
  test('a single day ends where it starts', () => {
    expect(getPageDateEndTime({ start: '2026-10-20' })).toBe(getPageDateStartTime({ start: '2026-10-20' }));
  });

  test('a range ends at its end', () => {
    expect(getPageDateEndTime({ end: '2026-10-25', start: '2026-10-20' })).toBe(Date.parse('2026-10-25'));
  });

  test('says whether a day falls inside the range, ends included', () => {
    const range = { end: '2026-10-25', start: '2026-10-20' };

    expect(pageDateContainsTime(range, Date.parse('2026-10-20'))).toBe(true);
    expect(pageDateContainsTime(range, Date.parse('2026-10-25'))).toBe(true);
    expect(pageDateContainsTime(range, Date.parse('2026-10-26'))).toBe(false);
    expect(pageDateContainsTime({ start: '2026-10-20' }, Date.parse('2026-10-20'))).toBe(true);
  });
});

describe('formatPageDate', () => {
  test('writes a day and a range', () => {
    expect(formatPageDate({ start: '2026-10-20' })).toBe('2026-10-20');
    expect(formatPageDate({ end: '2026-10-25', start: '2026-10-20' })).toBe('2026-10-20 → 2026-10-25');
  });
});
