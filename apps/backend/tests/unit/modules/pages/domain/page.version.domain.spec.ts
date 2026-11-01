import { describe, expect, it } from 'bun:test';
import { isSameEditingStretch } from '@/modules/pages/domain/page.version.domain';

const startedAt = new Date('2026-10-19T12:00:00.000Z');
const minutesLater = (minutes: number): Date => new Date(startedAt.getTime() + minutes * 60 * 1000);

describe('isSameEditingStretch', () => {
  it('folds a save by the same author within five minutes into the version they started', () => {
    expect(isSameEditingStretch({ createdAt: startedAt, createdById: 'ana' }, 'ana', minutesLater(4))).toBe(true);
  });

  it('cuts a new version once five minutes have passed since that one started', () => {
    expect(isSameEditingStretch({ createdAt: startedAt, createdById: 'ana' }, 'ana', minutesLater(5))).toBe(false);
  });

  it('cuts a new version when someone else saves', () => {
    expect(isSameEditingStretch({ createdAt: startedAt, createdById: 'ana' }, 'luis', minutesLater(1))).toBe(false);
  });
});
