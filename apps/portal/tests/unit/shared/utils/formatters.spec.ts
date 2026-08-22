import { describe, expect, it } from 'bun:test';
import { formatDate } from '@/shared/utils/formatters';

describe('formatDate', () => {
  it('formats a date-only string using the requested locale', () => {
    const result = formatDate('2026-03-15', { locale: 'en-US' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('Mar');
  });

  it('includes time when requested', () => {
    const withTime = formatDate('2026-03-15T14:30:00', { includeTime: true, locale: 'en-US' });
    expect(withTime).toMatch(/\d{2}:\d{2}/);
  });
});
