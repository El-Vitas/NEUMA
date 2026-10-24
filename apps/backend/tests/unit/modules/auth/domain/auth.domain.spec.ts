import { describe, expect, test } from 'bun:test';
import {
  isRefreshTokenCurrent,
  isReplayGraceOpen,
  isReplaySuccessorUsable,
} from '../../../../../src/modules/auth/domain/auth.domain';

describe('isRefreshTokenCurrent', () => {
  test('accepts a token whose version matches the account', () => {
    expect(isRefreshTokenCurrent(3, 3)).toBe(true);
  });

  test('rejects a token issued before the account last revoked its sessions', () => {
    expect(isRefreshTokenCurrent(2, 3)).toBe(false);
  });
});

describe('isReplayGraceOpen', () => {
  const now = new Date('2026-10-24T12:00:30.000Z');

  test('is open just after the token was used', () => {
    expect(isReplayGraceOpen(new Date('2026-10-24T12:00:25.000Z'), now, 10_000)).toBe(true);
  });

  test('is closed once the window has passed', () => {
    expect(isReplayGraceOpen(new Date('2026-10-24T12:00:00.000Z'), now, 10_000)).toBe(false);
  });
});

describe('isReplaySuccessorUsable', () => {
  const now = new Date('2026-10-24T12:00:00.000Z');
  const later = new Date('2026-10-31T12:00:00.000Z');

  test('accepts a successor that is unused and not expired', () => {
    expect(isReplaySuccessorUsable({ expiresAt: later, usedAt: null }, now)).toBe(true);
  });

  test('rejects a successor that is already used, expired or missing', () => {
    expect(isReplaySuccessorUsable({ expiresAt: later, usedAt: now }, now)).toBe(false);
    expect(isReplaySuccessorUsable({ expiresAt: now, usedAt: null }, now)).toBe(false);
    expect(isReplaySuccessorUsable(null, now)).toBe(false);
  });
});
