import { describe, expect, it } from 'bun:test';
import { isAccessTokenSpent } from '@/modules/auth/lib/auth.token.expiry.lib';

const buildToken = (expirySeconds: number): string => {
  const payload = Buffer.from(JSON.stringify({ exp: expirySeconds })).toString('base64url');
  return `header.${payload}.signature`;
};

describe('knowing when a session must be renewed', () => {
  const nowSeconds = 1_000_000;
  const leewaySeconds = 30;

  it('treats a token with time left as good', () => {
    expect(isAccessTokenSpent({ leewaySeconds, nowSeconds, token: buildToken(nowSeconds + 600) })).toBe(false);
  });

  it('treats an expired token as spent', () => {
    expect(isAccessTokenSpent({ leewaySeconds, nowSeconds, token: buildToken(nowSeconds - 1) })).toBe(true);
  });

  it('renews a little before the token dies, so no page is rendered with a doomed one', () => {
    expect(isAccessTokenSpent({ leewaySeconds, nowSeconds, token: buildToken(nowSeconds + 10) })).toBe(true);
  });

  it('treats a missing or unreadable token as spent', () => {
    expect(isAccessTokenSpent({ leewaySeconds, nowSeconds, token: undefined })).toBe(true);
    expect(isAccessTokenSpent({ leewaySeconds, nowSeconds, token: 'not-a-token' })).toBe(true);
    expect(isAccessTokenSpent({ leewaySeconds, nowSeconds, token: 'header.%%%.signature' })).toBe(true);
  });

  it('treats a token that never says when it expires as spent', () => {
    const withoutExpiry = `header.${Buffer.from(JSON.stringify({ sub: 'user' })).toString('base64url')}.signature`;

    expect(isAccessTokenSpent({ leewaySeconds, nowSeconds, token: withoutExpiry })).toBe(true);
  });
});
