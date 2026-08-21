import { describe, expect, it } from 'bun:test';
import { placeBefore } from '@/common/domain/ordering.domain';

const namesOf = (items: readonly { readonly id: string }[]): readonly string[] => items.map((item) => item.id);

describe('placeBefore', () => {
  const listed = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('sets one down right in front of the one it was dropped on', () => {
    expect(namesOf(placeBefore(listed, 'c', 'a') ?? [])).toEqual(['c', 'a', 'b']);
  });

  it('sends one to the end when it was dropped after everything', () => {
    expect(namesOf(placeBefore(listed, 'a', null) ?? [])).toEqual(['b', 'c', 'a']);
  });

  it('leaves the order alone when something is dropped exactly where it already was', () => {
    expect(namesOf(placeBefore(listed, 'b', 'c') ?? [])).toEqual(['a', 'b', 'c']);
  });

  it('knows nothing of a thing that is not in the list', () => {
    expect(placeBefore(listed, 'z', 'a')).toBeNull();
    expect(placeBefore(listed, 'a', 'z')).toBeNull();
  });

  it('refuses to place something in front of itself, which asks for nothing', () => {
    expect(namesOf(placeBefore(listed, 'b', 'b') ?? [])).toEqual(['a', 'b', 'c']);
  });
});
