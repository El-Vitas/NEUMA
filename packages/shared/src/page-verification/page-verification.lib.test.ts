import { describe, expect, test } from 'bun:test';
import { resolvePageVerificationStatus } from './page-verification.lib.js';

const now = new Date('2026-06-15T00:00:00.000Z');

describe('resolvePageVerificationStatus', () => {
  test('reads a page nobody verified as unverified', () => {
    expect(resolvePageVerificationStatus(null, null, now)).toBe('UNVERIFIED');
  });

  test('reads a verified page with no expiration as verified', () => {
    expect(resolvePageVerificationStatus(new Date('2026-01-01T00:00:00.000Z'), null, now)).toBe('VERIFIED');
  });

  test('reads a verified page with a future expiration as verified', () => {
    const verifiedAt = new Date('2026-01-01T00:00:00.000Z');
    const expiresAt = new Date('2026-07-01T00:00:00.000Z');
    expect(resolvePageVerificationStatus(verifiedAt, expiresAt, now)).toBe('VERIFIED');
  });

  test('reads a verified page past its expiration as expired, without forgetting it was verified', () => {
    const verifiedAt = new Date('2026-01-01T00:00:00.000Z');
    const expiresAt = new Date('2026-05-01T00:00:00.000Z');
    expect(resolvePageVerificationStatus(verifiedAt, expiresAt, now)).toBe('EXPIRED');
  });
});
