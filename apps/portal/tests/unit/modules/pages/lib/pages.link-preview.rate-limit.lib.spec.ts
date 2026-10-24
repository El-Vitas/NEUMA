import { describe, expect, it } from 'bun:test';
import { createLinkPreviewRateLimiter } from '@/modules/pages/links/lib/pages.link-preview.rate-limit.lib';

const buildLimiter = (clock: { current: number }, trackedKeysMaximum = 100) =>
  createLinkPreviewRateLimiter({ maximum: 2, now: () => clock.current, trackedKeysMaximum, windowMs: 1000 });

describe('link preview rate limiter', () => {
  it('lets a client ask up to the maximum and then refuses', () => {
    const limiter = buildLimiter({ current: 0 });

    expect([limiter.isAllowed('a'), limiter.isAllowed('a'), limiter.isAllowed('a')]).toEqual([true, true, false]);
  });

  it('counts each client on its own', () => {
    const limiter = buildLimiter({ current: 0 });
    limiter.isAllowed('a');
    limiter.isAllowed('a');

    expect(limiter.isAllowed('b')).toBe(true);
  });

  it('lets a client back in when its window is over', () => {
    const clock = { current: 0 };
    const limiter = buildLimiter(clock);
    limiter.isAllowed('a');
    limiter.isAllowed('a');

    clock.current = 1000;

    expect(limiter.isAllowed('a')).toBe(true);
  });

  it('refuses new clients rather than growing past the tracked maximum', () => {
    const limiter = buildLimiter({ current: 0 }, 2);
    limiter.isAllowed('a');
    limiter.isAllowed('b');

    expect(limiter.isAllowed('c')).toBe(false);
  });
});
