import { describe, expect, it } from 'bun:test';
import { describePageMediaMoment, describePageMediaTime } from '@/modules/pages/lib/pages.editor.media.lib';

describe('how far along something that plays is', () => {
  it('says it the way a player says it', () => {
    expect(describePageMediaTime(0)).toBe('0:00');
    expect(describePageMediaTime(7)).toBe('0:07');
    expect(describePageMediaTime(118)).toBe('1:58');
    expect(describePageMediaTime(3671)).toBe('1:01:11');
  });

  /** Nothing is known about a recording until it has been read, and a player still has to say something. */
  it('says nothing rather than something false while the length is unknown', () => {
    expect(describePageMediaTime(Number.NaN)).toBe('0:00');
    expect(describePageMediaTime(Number.POSITIVE_INFINITY)).toBe('0:00');
    expect(describePageMediaTime(-4)).toBe('0:00');
  });

  it('reads out both halves at once', () => {
    expect(describePageMediaMoment(7, 118)).toBe('0:07 / 1:58');
  });
});
