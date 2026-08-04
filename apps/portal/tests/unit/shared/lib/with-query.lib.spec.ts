import { describe, expect, it, mock } from 'bun:test';

let cookieValue: string | undefined;

mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
}));
mock.module('@/lib/logger', () => ({ logger: { error: () => undefined, info: () => undefined } }));

const { withQuery } = await import('@/shared/lib/with-query.lib');

describe('withQuery without an access token', () => {
  it('fails closed without invoking the query function', async () => {
    cookieValue = undefined;
    const fn = mock(async (_accessToken: string) => 'unreachable');

    const result = await withQuery({ op: 'test' }, fn);

    expect(result.isFail()).toBe(true);
    expect(result.getError()).toBeInstanceOf(Error);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('withQuery with an access token', () => {
  it('resolves with the query function result', async () => {
    cookieValue = 'valid-access-token';
    const fn = mock(async (accessToken: string) => `value-for-${accessToken}`);

    const result = await withQuery({ op: 'test' }, fn);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toBe('value-for-valid-access-token');
    expect(fn).toHaveBeenCalledWith('valid-access-token');
  });
});
