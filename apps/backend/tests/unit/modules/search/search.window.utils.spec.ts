import { describe, expect, test } from 'bun:test';
import { SEARCH_MAX_WINDOW, SEARCH_WINDOW_GROWTH } from '@/modules/search/constants/search.constants';
import { toInitialWindowSize, toWiderWindowSize } from '@/modules/search/utils/search.window.utils';

describe('the window of best matches', () => {
  test('starts at a multiple of the rows wanted', () => {
    expect(toInitialWindowSize(41)).toBeGreaterThan(41);
  });

  test('grows at least by the usual factor when most of it survives', () => {
    expect(toWiderWindowSize(100, 30, 41)).toBeGreaterThanOrEqual(100 * SEARCH_WINDOW_GROWTH);
  });

  test('jumps by the share that was lost when most of the window was left out', () => {
    expect(toWiderWindowSize(100, 1, 41)).toBeGreaterThan(100 * 41);
  });

  test('jumps far when nothing survived, and never past the cap', () => {
    const widened = toWiderWindowSize(100, 0, 41);

    expect(widened).toBeGreaterThan(100 * 41);
    expect(widened).toBeLessThanOrEqual(SEARCH_MAX_WINDOW);
  });
});
