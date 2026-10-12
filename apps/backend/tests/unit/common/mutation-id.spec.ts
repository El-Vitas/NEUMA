import { describe, expect, it } from 'bun:test';
import { MUTATION_ID_SHAPE } from '@/common/constants/mutation.constants';

describe('MUTATION_ID_SHAPE', () => {
  it('accepts the name a change is given', () => {
    expect(MUTATION_ID_SHAPE.test('019ff3f9-2bc6-7373-9f81-f4469fa28a36')).toBe(true);
  });

  it('refuses a name that is missing or made up', () => {
    expect(MUTATION_ID_SHAPE.test('undefined')).toBe(false);
    expect(MUTATION_ID_SHAPE.test('')).toBe(false);
    expect(MUTATION_ID_SHAPE.test('019ff3f9')).toBe(false);
    expect(MUTATION_ID_SHAPE.test('019ff3f9-2bc6-7373-9f81-f4469fa28a36-extra')).toBe(false);
  });
});
