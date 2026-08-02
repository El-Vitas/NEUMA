import { describe, expect, test } from 'bun:test';
import { PAGE_LIFECYCLE, PAGE_LIFECYCLE_VALUES } from './page.types.js';

describe('page contracts', () => {
  test('exposes the canonical lifecycle values', () => {
    expect(PAGE_LIFECYCLE_VALUES).toEqual([PAGE_LIFECYCLE.ACTIVE, PAGE_LIFECYCLE.TRASHED]);
  });
});
