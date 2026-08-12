import { describe, expect, it } from 'bun:test';
import { parseTokenLifetimeSeconds } from '../../../../../src/modules/auth/utils/auth.token.utils';

describe('reading how long a token lives', () => {
  it('reads minutes, hours and days the way tokens are written', () => {
    expect(parseTokenLifetimeSeconds('15m', 1)).toBe(900);
    expect(parseTokenLifetimeSeconds('6h', 1)).toBe(21_600);
    expect(parseTokenLifetimeSeconds('7d', 1)).toBe(604_800);
  });

  it('reads a plain number as seconds', () => {
    expect(parseTokenLifetimeSeconds('45', 1)).toBe(45);
  });

  it('falls back when the lifetime cannot be read, instead of leaving a session without one', () => {
    expect(parseTokenLifetimeSeconds('', 900)).toBe(900);
    expect(parseTokenLifetimeSeconds('forever', 900)).toBe(900);
    expect(parseTokenLifetimeSeconds('0m', 900)).toBe(900);
    expect(parseTokenLifetimeSeconds('-5m', 900)).toBe(900);
  });
});
