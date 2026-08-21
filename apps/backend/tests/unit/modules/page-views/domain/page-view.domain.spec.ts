import { describe, expect, it } from 'bun:test';
import { shouldRecordPageView } from '@/modules/page-views/domain/page-view.domain';

describe('shouldRecordPageView', () => {
  it('records a first-ever view', () => {
    expect(shouldRecordPageView(null, new Date('2026-08-20T12:00:00Z'), 1_800_000)).toBe(true);
  });

  it('skips a view that arrives inside the cooldown window', () => {
    const lastViewedAt = new Date('2026-08-20T12:00:00Z');
    const now = new Date('2026-08-20T12:10:00Z');
    expect(shouldRecordPageView(lastViewedAt, now, 1_800_000)).toBe(false);
  });

  it('records a view that arrives right at the cooldown boundary', () => {
    const lastViewedAt = new Date('2026-08-20T12:00:00Z');
    const now = new Date('2026-08-20T12:30:00Z');
    expect(shouldRecordPageView(lastViewedAt, now, 1_800_000)).toBe(true);
  });

  it('records a return visit well after the cooldown window', () => {
    const lastViewedAt = new Date('2026-08-20T09:00:00Z');
    const now = new Date('2026-08-20T12:00:00Z');
    expect(shouldRecordPageView(lastViewedAt, now, 1_800_000)).toBe(true);
  });
});
