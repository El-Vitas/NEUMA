import { describe, expect, test } from 'bun:test';
import { isRefreshTokenCurrent } from '../../../../../src/modules/auth/domain/auth.domain';

describe('isRefreshTokenCurrent', () => {
  test('accepts a token whose version matches the account', () => {
    expect(isRefreshTokenCurrent(3, 3)).toBe(true);
  });

  test('rejects a token issued before the account last revoked its sessions', () => {
    expect(isRefreshTokenCurrent(2, 3)).toBe(false);
  });

  test('treats a token without a version as version 0', () => {
    expect(isRefreshTokenCurrent(undefined, 0)).toBe(true);
    expect(isRefreshTokenCurrent(undefined, 1)).toBe(false);
  });
});
