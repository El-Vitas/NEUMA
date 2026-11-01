import { describe, expect, it } from 'bun:test';
import { compareCodeUnits } from '@/common/utils/compare.utils';

describe('compareCodeUnits', () => {
  it('orders by code unit, so an uppercase letter comes before a lowercase one in any locale', () => {
    expect(['b', 'B', 'a', 'A'].toSorted(compareCodeUnits)).toEqual(['A', 'B', 'a', 'b']);
  });

  it('answers zero for equal strings', () => {
    expect(compareCodeUnits('same', 'same')).toBe(0);
  });

  it('orders ids the way the default sort did', () => {
    const ids = ['0192-b', '0192-a', '0191-z', '0192-A'];

    expect(ids.toSorted(compareCodeUnits)).toEqual(ids.toSorted());
  });
});
