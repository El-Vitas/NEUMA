import { describe, expect, test } from 'bun:test';
import { SPACE_VISIBILITY, SPACE_VISIBILITY_VALUES } from './space.types.js';

describe('space contracts', () => {
  test('exposes the canonical visibility values', () => {
    expect(SPACE_VISIBILITY_VALUES).toEqual([SPACE_VISIBILITY.PUBLIC_INTERNAL, SPACE_VISIBILITY.RESTRICTED]);
  });
});
