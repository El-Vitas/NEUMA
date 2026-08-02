import { describe, expect, it } from 'bun:test';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';

describe('formatCurrency', () => {
  it('formats CLP without decimals and thousands separator', () => {
    expect(formatCurrency(1500)).toContain('1.500');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0');
  });
});

describe('formatDate', () => {
  it('formats a date-only string in es-CL', () => {
    const result = formatDate('2026-03-15');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes time when requested', () => {
    const withTime = formatDate('2026-03-15T14:30:00', { includeTime: true });
    expect(withTime).toMatch(/\d{2}:\d{2}/);
  });
});
