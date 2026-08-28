import { describe, expect, test } from 'bun:test';
import { readVisiblePropertyKeys } from './page-view.visibility.lib.js';

const available = ['status', 'assignee', 'dueDate'];

describe('readVisiblePropertyKeys', () => {
  /** A view that never said anything shows what the collection has, in the order it has it. */
  test('shows everything when the view chose nothing', () => {
    expect(readVisiblePropertyKeys(null, available)).toEqual(available);
  });

  test('shows what the view chose, in the order it chose', () => {
    expect(readVisiblePropertyKeys(['dueDate', 'status'], available)).toEqual(['dueDate', 'status']);
  });

  test('shows nothing when the view chose nothing on purpose', () => {
    expect(readVisiblePropertyKeys([], available)).toEqual([]);
  });

  /** A property removed from the collection cannot be shown, whatever the view still remembers. */
  test('leaves out what the collection no longer has', () => {
    expect(readVisiblePropertyKeys(['status', 'removed'], available)).toEqual(['status']);
  });

  test('shows a property once even when the view names it twice', () => {
    expect(readVisiblePropertyKeys(['status', 'status'], available)).toEqual(['status']);
  });
});
