import { describe, expect, it, mock } from 'bun:test';

let cookieValue: string | undefined;

mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
}));

const { MissingAccessTokenError, readAccessTokenCookie, requireAccessTokenCookie } = await import(
  '@/shared/lib/auth.token.lib'
);

describe('readAccessTokenCookie', () => {
  it('returns undefined when there is no access token cookie', async () => {
    cookieValue = undefined;

    await expect(readAccessTokenCookie()).resolves.toBeUndefined();
  });

  it('returns the access token when present', async () => {
    cookieValue = 'valid-access-token';

    await expect(readAccessTokenCookie()).resolves.toBe('valid-access-token');
  });
});

describe('requireAccessTokenCookie', () => {
  it('throws a MissingAccessTokenError when there is no access token cookie', async () => {
    cookieValue = undefined;

    await expect(requireAccessTokenCookie()).rejects.toBeInstanceOf(MissingAccessTokenError);
    await expect(requireAccessTokenCookie()).rejects.toThrow('Authentication is required for this action');
  });

  it('resolves with the access token when present', async () => {
    cookieValue = 'valid-access-token';

    await expect(requireAccessTokenCookie()).resolves.toBe('valid-access-token');
  });
});
