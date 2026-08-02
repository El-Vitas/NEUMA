import { describe, expect, it } from 'bun:test';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';

describe('formatCurrency', () => {
  it('formats CLP without decimals and thousands separator', () => {
    expect(formatCurrency(1500, 'es-CL')).toContain('1.500');
  });

  it('formats zero', () => {
    expect(formatCurrency(0, 'en-US')).toContain('0');
  });
});

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
