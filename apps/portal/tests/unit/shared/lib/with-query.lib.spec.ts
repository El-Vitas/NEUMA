import { describe, expect, it, mock } from 'bun:test';

let cookieValue: string | undefined;
const calls: string[] = [];
const redirectedTo: unknown[] = [];
let isSessionRejected = false;

class RedirectSignal extends Error {}

mock.module('@/shared/lib/api-server', () => ({ isSessionRejected: async () => isSessionRejected }));
mock.module('next-intl/server', () => ({ getLocale: async () => 'en' }));
mock.module('@/i18n/navigation', () => ({
  redirect: (target: unknown) => {
    redirectedTo.push(target);
    throw new RedirectSignal();
  },
}));
mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
}));
mock.module('next/server', () => ({
  connection: async () => {
    calls.push('connection');
  },
}));
mock.module('@/lib/logger', () => ({
  logger: {
    error: () => {
      calls.push('error');
    },
    info: () => {
      calls.push('log');
    },
  },
}));

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

describe("withQuery and Next's own control flow", () => {
  it('lets an error Next throws on purpose through, instead of logging it as a failed query', async () => {
    cookieValue = 'valid-access-token';
    const { notFound } = await import('next/navigation');

    const outcome = withQuery({ op: 'test' }, async () => notFound());

    expect(outcome).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
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

describe('withQuery logging', () => {
  // Every log line carries the wall-clock time, which Next refuses to read while it prerenders the page.
  it.each([
    ['with an access token', 'valid-access-token'],
    ['without an access token', undefined],
  ])('waits for the request before writing its first log line %s', async (_case, cookie) => {
    cookieValue = cookie;
    calls.length = 0;

    await withQuery({ op: 'test' }, async () => 'value');

    expect(calls[0]).toBe('connection');
  });
});

describe('withQuery with an expired session', () => {
  // A cached query loses the 401 it got, so the session is asked again before calling the failure an error.
  it('sends the visitor to the login page instead of logging the failed query', async () => {
    cookieValue = 'expired-access-token';
    calls.length = 0;
    redirectedTo.length = 0;
    isSessionRejected = true;

    const outcome = withQuery({ op: 'test' }, async () => {
      throw new Error('Token expired');
    });

    await expect(outcome).rejects.toBeInstanceOf(RedirectSignal);
    expect(redirectedTo).toEqual([{ href: '/login', locale: 'en' }]);
    expect(calls).not.toContain('error');
    isSessionRejected = false;
  });
});
