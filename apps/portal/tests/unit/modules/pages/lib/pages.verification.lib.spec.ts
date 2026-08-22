import { describe, expect, it } from 'bun:test';
import {
  fromVerificationExpiryInputValue,
  resolvePageVerificationStatus,
  toVerificationExpiryInputValue,
} from '@/modules/pages/trust/lib/pages.verification.lib';

const now = new Date('2026-06-15T00:00:00.000Z');

describe('resolvePageVerificationStatus', () => {
  it('reads a page nobody verified as unverified', () => {
    expect(resolvePageVerificationStatus(null, null, now)).toBe('UNVERIFIED');
  });

  it('reads a verified page with no expiration as verified', () => {
    expect(resolvePageVerificationStatus(new Date('2026-01-01T00:00:00.000Z'), null, now)).toBe('VERIFIED');
  });

  it('reads a verified page with a future expiration as verified', () => {
    const verifiedAt = new Date('2026-01-01T00:00:00.000Z');
    const expiresAt = new Date('2026-07-01T00:00:00.000Z');
    expect(resolvePageVerificationStatus(verifiedAt, expiresAt, now)).toBe('VERIFIED');
  });

  it('reads a verified page past its expiration as expired, without forgetting it was verified', () => {
    const verifiedAt = new Date('2026-01-01T00:00:00.000Z');
    const expiresAt = new Date('2026-05-01T00:00:00.000Z');
    expect(resolvePageVerificationStatus(verifiedAt, expiresAt, now)).toBe('EXPIRED');
  });
});

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
