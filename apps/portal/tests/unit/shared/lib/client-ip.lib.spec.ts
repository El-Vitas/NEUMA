import { describe, expect, it } from 'bun:test';
import { forwardedForHeaders, readClientIp } from '@/shared/lib/client-ip.lib';

describe('readClientIp', () => {
  it('prefers the address Cloudflare sets at the edge', () => {
    const incoming = new Headers({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '10.0.0.5' });

    expect(readClientIp(incoming)).toBe('203.0.113.7');
  });

  it('falls back to the first hop of X-Forwarded-For', () => {
    expect(readClientIp(new Headers({ 'x-forwarded-for': '198.51.100.4, 10.0.0.5' }))).toBe('198.51.100.4');
  });

  it('accepts an IPv6 address', () => {
    expect(readClientIp(new Headers({ 'cf-connecting-ip': '2001:db8::1' }))).toBe('2001:db8::1');
  });

  it('drops a value that is not an address instead of forwarding it', () => {
    expect(readClientIp(new Headers({ 'cf-connecting-ip': 'evil, 1.2.3.4' }))).toBeUndefined();
    expect(readClientIp(new Headers({ 'cf-connecting-ip': '<script>' }))).toBeUndefined();
  });

  it('returns nothing when no proxy header arrived', () => {
    expect(readClientIp(new Headers())).toBeUndefined();
  });
});

describe('forwardedForHeaders', () => {
  it('builds the header only when there is an address', () => {
    expect(forwardedForHeaders('203.0.113.7')).toEqual({ 'x-forwarded-for': '203.0.113.7' });
    expect(forwardedForHeaders(undefined)).toEqual({});
  });
});
