import { describe, expect, it } from 'bun:test';
import {
  buildFilterDateValue,
  listFilterDateChoices,
  readFilterDateChoice,
} from '@/modules/pages/collections/lib/pages.filter-date.lib';

describe('la fecha de un filtro', () => {
  it('reads a day written out as an exact date', () => {
    expect(readFilterDateChoice('2026-10-21')).toEqual({ choice: 'EXACT', days: null });
  });

  it('reads nothing chosen yet as an exact date', () => {
    expect(readFilterDateChoice(null)).toEqual({ choice: 'EXACT', days: null });
  });

  it('reads a fixed relative word as itself', () => {
    expect(readFilterDateChoice('@this_week')).toEqual({ choice: '@this_week', days: null });
    expect(readFilterDateChoice('@today')).toEqual({ choice: '@today', days: null });
  });

  it('reads a count of days as the choice and its number', () => {
    expect(readFilterDateChoice('@past_days:14')).toEqual({ choice: 'PAST_DAYS', days: 14 });
    expect(readFilterDateChoice('@next_days:3')).toEqual({ choice: 'NEXT_DAYS', days: 3 });
  });

  it('builds the value a choice stands for', () => {
    expect(buildFilterDateValue('@next_month', null, '2026-10-21')).toBe('@next_month');
    expect(buildFilterDateValue('PAST_DAYS', 7, '2026-10-21')).toBe('@past_days:7');
    expect(buildFilterDateValue('NEXT_DAYS', 30, '2026-10-21')).toBe('@next_days:30');
    expect(buildFilterDateValue('EXACT', null, '2026-10-21')).toBe('2026-10-21');
  });

  it('keeps the count of days inside what the server accepts', () => {
    expect(buildFilterDateValue('PAST_DAYS', 0, '2026-10-21')).toBe('@past_days:1');
    expect(buildFilterDateValue('NEXT_DAYS', 9999, '2026-10-21')).toBe('@next_days:365');
  });

  it('offers the exact date first and every relative word after it', () => {
    const choices = listFilterDateChoices();

    expect(choices[0]).toBe('EXACT');
    expect(choices).toContain('@today');
    expect(choices).toContain('PAST_DAYS');
    expect(choices).toContain('NEXT_DAYS');
  });
});
