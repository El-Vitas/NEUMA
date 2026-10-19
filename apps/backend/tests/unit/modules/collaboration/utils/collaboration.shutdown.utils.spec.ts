import { describe, expect, test } from 'bun:test';
import type { CollaborationStoreTracker } from '../../../../../src/modules/collaboration/types/collaboration.types';
import { waitForPendingStores } from '../../../../../src/modules/collaboration/utils/collaboration.shutdown.utils';

const trackerSavingFor = (pollsByDocument: Record<string, number>): CollaborationStoreTracker => {
  const remaining = new Map(Object.entries(pollsByDocument));
  const isSaving = (debounceId: string): boolean => {
    const documentName = debounceId.replace('onStoreDocument-', '');
    const polls = remaining.get(documentName) ?? 0;
    if (polls <= 0) return false;
    remaining.set(documentName, polls - 1);
    return true;
  };
  return { debouncer: { isCurrentlyExecuting: () => false, isDebounced: isSaving } };
};

describe('waitForPendingStores', () => {
  test('resolves empty once every queued save has finished', async () => {
    const tracker = trackerSavingFor({ 'page:a': 3, 'page:b': 1 });

    const unsaved = await waitForPendingStores(tracker, ['page:a', 'page:b'], 1000, 1);

    expect(unsaved).toEqual([]);
  });

  test('returns the documents still saving when the deadline passes', async () => {
    const tracker = trackerSavingFor({ 'page:a': Number.POSITIVE_INFINITY, 'page:b': 1 });

    const unsaved = await waitForPendingStores(tracker, ['page:a', 'page:b'], 20, 5);

    expect(unsaved).toEqual(['page:a']);
  });

  test('also waits for a save that is already running', async () => {
    let runningPolls = 2;
    const tracker: CollaborationStoreTracker = {
      debouncer: {
        isCurrentlyExecuting: () => {
          runningPolls -= 1;
          return runningPolls >= 0;
        },
        isDebounced: () => false,
      },
    };

    const unsaved = await waitForPendingStores(tracker, ['page:a'], 1000, 1);

    expect(unsaved).toEqual([]);
    expect(runningPolls).toBeLessThan(0);
  });
});
