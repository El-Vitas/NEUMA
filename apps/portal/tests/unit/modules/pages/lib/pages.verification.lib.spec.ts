import { describe, expect, it } from 'bun:test';
import {
  fromVerificationExpiryInputValue,
  toVerificationExpiryInputValue,
} from '@/modules/pages/trust/lib/pages.verification.lib';

describe('toVerificationExpiryInputValue', () => {
  it('reads no expiration as an empty date field', () => {
    expect(toVerificationExpiryInputValue(null)).toBe('');
  });

  it('reads an expiration as its calendar day', () => {
    expect(toVerificationExpiryInputValue(new Date('2026-09-01T23:59:59.999Z'))).toBe('2026-09-01');
  });
});

describe('fromVerificationExpiryInputValue', () => {
  it('reads an empty field as no expiration', () => {
    expect(fromVerificationExpiryInputValue('')).toBeUndefined();
  });

  it('keeps the chosen day vigente through its last instant', () => {
    expect(fromVerificationExpiryInputValue('2026-09-01')).toBe('2026-09-01T23:59:59.999Z');
  });
});
