import { describe, expect, it } from 'bun:test';
import { forwardedForHeaders, readClientIp } from '@/shared/lib/client-ip.lib';

const behindCloudflare = { trustedProxyCount: 1, trustsCloudflareHeader: true };

describe('readClientIp', () => {
  it('uses the address Cloudflare sets only when the deployment says it is the sole entry', () => {
    const incoming = new Headers({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '10.0.0.5' });

    expect(readClientIp(incoming, behindCloudflare)).toBe('203.0.113.7');
    expect(readClientIp(incoming)).toBe('10.0.0.5');
  });

  it('believes the entry our own proxy appended, not the one the browser sent', () => {
    const incoming = new Headers({ 'x-forwarded-for': '1.1.1.1, 198.51.100.4' });

    expect(readClientIp(incoming)).toBe('198.51.100.4');
  });

  it('skips as many entries from the right as there are trusted proxies', () => {
    const incoming = new Headers({ 'x-forwarded-for': '1.1.1.1, 198.51.100.4, 10.0.0.5' });

    expect(readClientIp(incoming, { trustedProxyCount: 2, trustsCloudflareHeader: false })).toBe('198.51.100.4');
  });

  it('forwards nothing when no proxy is trusted', () => {
    const incoming = new Headers({ 'x-forwarded-for': '1.1.1.1' });

    expect(readClientIp(incoming, { trustedProxyCount: 0, trustsCloudflareHeader: false })).toBeUndefined();
  });

  it('accepts an IPv6 address', () => {
    expect(readClientIp(new Headers({ 'cf-connecting-ip': '2001:db8::1' }), behindCloudflare)).toBe('2001:db8::1');
  });

  it('drops a value that is not an address instead of forwarding it', () => {
    expect(readClientIp(new Headers({ 'cf-connecting-ip': 'evil, 1.2.3.4' }), behindCloudflare)).toBeUndefined();
    expect(readClientIp(new Headers({ 'cf-connecting-ip': '<script>' }), behindCloudflare)).toBeUndefined();
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
