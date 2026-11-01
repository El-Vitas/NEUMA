import type { PagePropertyValue } from '../types/pages.schema.types';
import type { PageViewWrite, PendingValuesStore } from '../types/pages.view-writes.types';
import { readWrittenRowId, readWrittenValues } from './pages.view-writes.written.lib';

/**
 * The values that writes not yet answered give to cells, with a listener per row: an edit repaints the cells of its
 * row and not every cell of every view.
 */
export const createPendingValuesStore = (): PendingValuesStore => {
  let unanswered: readonly PageViewWrite[] = [];
  const rowListeners = new Map<string, Set<() => void>>();

  const announce = (write: PageViewWrite): void => {
    const rowId = readWrittenRowId(write);
    if (rowId === null) return;
    for (const listener of rowListeners.get(rowId) ?? []) listener();
  };

  return {
    add: (write) => {
      unanswered = [...unanswered, write];
      announce(write);
    },
    read: (rowId, propertyKey): null | PagePropertyValue | undefined => {
      for (const write of unanswered.toReversed()) {
        const values = readWrittenValues(write);
        if (readWrittenRowId(write) === rowId && Object.hasOwn(values, propertyKey)) return values[propertyKey] ?? null;
      }
      return;
    },
    remove: (write) => {
      unanswered = unanswered.filter((held) => held !== write);
      announce(write);
    },
    subscribeRow: (rowId, listener) => {
      const held = rowListeners.get(rowId) ?? new Set<() => void>();
      held.add(listener);
      rowListeners.set(rowId, held);
      return () => {
        held.delete(listener);
      };
    },
  };
};
