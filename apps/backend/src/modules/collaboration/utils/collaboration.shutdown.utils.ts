import type { CollaborationStoreTracker } from '../types/collaboration.types';

// Hocuspocus keys each document's debounced save this way; its own shutdown helpers use the same id.
const storeDebounceId = (documentName: string): string => `onStoreDocument-${documentName}`;

const hasPendingStore = (tracker: CollaborationStoreTracker, documentName: string): boolean => {
  const debounceId = storeDebounceId(documentName);
  return tracker.debouncer.isDebounced(debounceId) || tracker.debouncer.isCurrentlyExecuting(debounceId);
};

const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Resolves with the documents still saving when the deadline passes; empty means every save landed. */
export const waitForPendingStores = async (
  tracker: CollaborationStoreTracker,
  documentNames: readonly string[],
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<readonly string[]> => {
  const deadline = performance.now() + timeoutMs;
  let pending = documentNames.filter((documentName) => hasPendingStore(tracker, documentName));
  while (pending.length > 0 && performance.now() < deadline) {
    await wait(pollIntervalMs);
    pending = pending.filter((documentName) => hasPendingStore(tracker, documentName));
  }
  return pending;
};
