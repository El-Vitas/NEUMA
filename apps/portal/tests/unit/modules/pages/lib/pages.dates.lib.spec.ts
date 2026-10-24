import { describe, expect, it } from 'bun:test';
import {
  buildDateValue,
  formatDateValueForDisplay,
  moveDateValueTo,
  toDayInputValue,
} from '@/modules/pages/collections/lib/pages.dates.lib';

describe('how a date reads', () => {
  it('draws a day as written, whatever the time zone of the reader', () => {
    expect(formatDateValueForDisplay({ start: '2026-03-01' }, 'en')).toBe('Mar 1, 2026');
  });

  it('draws a range with an arrow between its two days', () => {
    expect(formatDateValueForDisplay({ end: '2026-03-03', start: '2026-03-01' }, 'en')).toBe(
      'Mar 1, 2026 → Mar 3, 2026',
    );
  });

  it('draws a moment with its hour', () => {
    expect(formatDateValueForDisplay({ start: '2026-03-01T10:30:00.000Z' }, 'en')).toContain('2026');
    expect(formatDateValueForDisplay({ start: '2026-03-01T10:30:00.000Z' }, 'en')).toMatch(/\d{2}:\d{2}/);
  });

  it('shows what it cannot read exactly as it was stored', () => {
    expect(formatDateValueForDisplay({ start: 'someday' }, 'en')).toBe('someday');
  });
});

describe('how a date is typed', () => {
  it('keeps only the day of a moment for a field that picks days', () => {
    expect(toDayInputValue('2026-03-01T10:30:00.000Z')).toBe('2026-03-01');
    expect(toDayInputValue(undefined)).toBe('');
  });

  it('builds nothing without a start, because an end alone is not a date', () => {
    expect(buildDateValue('', '2026-03-03')).toBeNull();
  });

  it('builds a day, or a range when the end is there', () => {
    expect(buildDateValue('2026-03-01', '')).toEqual({ start: '2026-03-01' });
    expect(buildDateValue('2026-03-01', '2026-03-03')).toEqual({ end: '2026-03-03', start: '2026-03-01' });
  });
});

describe('moveDateValueTo', () => {
  it('puts a day on another day', () => {
    expect(moveDateValueTo({ start: '2026-03-01' }, '2026-03-14')).toEqual({ start: '2026-03-14' });
  });

  it('keeps the length of a range', () => {
    expect(moveDateValueTo({ end: '2026-03-03', start: '2026-03-01' }, '2026-03-10')).toEqual({
      end: '2026-03-12',
      start: '2026-03-10',
    });
  });

  it('keeps the hour of a moment', () => {
    expect(moveDateValueTo({ start: '2026-03-01T10:30:00.000Z' }, '2026-03-02')).toEqual({
      start: '2026-03-02T10:30:00.000Z',
    });
  });

  it('crosses the end of a month without losing a day', () => {
    expect(moveDateValueTo({ end: '2026-02-28', start: '2026-02-27' }, '2026-03-31')).toEqual({
      end: '2026-04-01',
      start: '2026-03-31',
    });
  });

  it('starts a date when the row had none', () => {
    expect(moveDateValueTo(null, '2026-03-14')).toEqual({ start: '2026-03-14' });
  });
});
