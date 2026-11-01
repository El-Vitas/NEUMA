import { describe, expect, it } from 'bun:test';
import { applyValueListChanges } from '@/modules/pages/domain/page-value-list.domain';

describe('applyValueListChanges', () => {
  it('takes entries out first and then puts the new ones after those that stay', () => {
    const values = applyValueListChanges({ tags: ['a', 'c'] }, { tags: { add: ['b'], remove: ['a'] } });

    expect(values).toEqual({ tags: ['c', 'b'] });
  });

  it('never repeats an entry the list already holds', () => {
    const values = applyValueListChanges({ tags: ['a'] }, { tags: { add: ['a', 'b', 'b'], remove: [] } });

    expect(values).toEqual({ tags: ['a', 'b'] });
  });

  it('leaves no key behind when the list ends up empty', () => {
    const values = applyValueListChanges({ other: 'x', tags: ['a'] }, { tags: { add: [], remove: ['a'] } });

    expect(values).toEqual({ other: 'x' });
  });

  it('starts a list in a row that had none', () => {
    const values = applyValueListChanges(null, { tags: { add: ['a'], remove: [] } });

    expect(values).toEqual({ tags: ['a'] });
  });
});
