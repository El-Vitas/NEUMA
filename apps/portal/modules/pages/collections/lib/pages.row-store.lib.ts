import type { PageRowStore } from '../types/pages.row-store.types';
import type { PageRow } from '../types/pages.schema.types';

const isSameRow = (left: PageRow, right: PageRow): boolean =>
  left === right || JSON.stringify(left) === JSON.stringify(right);

/** An in-memory store of the rows of one collection, with a listener per row and one for the whole. */
export const createPageRowStore = (): PageRowStore => {
  let rows = new Map<string, PageRow>();
  let version = 0;
  let listed: readonly PageRow[] | null = null;
  const listeners = new Set<() => void>();
  const rowListeners = new Map<string, Set<() => void>>();

  const announce = (changedIds: ReadonlySet<string>): void => {
    if (changedIds.size === 0) return;
    version += 1;
    listed = null;
    for (const id of changedIds) {
      for (const listener of rowListeners.get(id) ?? []) listener();
    }
    for (const listener of listeners) listener();
  };

  return {
    getRow: (id) => rows.get(id),
    getVersion: () => version,
    listRows: () => {
      listed ??= [...rows.values()];
      return listed;
    },
    moveRow: (id, anchor) => {
      const moving = rows.get(id);
      const anchorId = anchor.before ?? anchor.after;
      if (moving === undefined || anchorId === undefined || anchorId === id || !rows.has(anchorId)) return;
      const others = [...rows.values()].filter((row) => row.id !== id);
      const anchorAt = others.findIndex((row) => row.id === anchorId);
      const insertAt = anchor.before === undefined ? anchorAt + 1 : anchorAt;
      rows = new Map([...others.slice(0, insertAt), moving, ...others.slice(insertAt)].map((row) => [row.id, row]));
      announce(new Set([id]));
    },
    removeRows: (ids) => {
      const removed = new Set(ids.filter((id) => rows.delete(id)));
      announce(removed);
    },
    replaceAll: (incoming) => {
      const next = new Map(incoming.map((row) => [row.id, row]));
      const changed = new Set<string>();
      for (const [id, held] of rows) {
        const arriving = next.get(id);
        if (arriving === undefined || !isSameRow(held, arriving)) changed.add(id);
      }
      for (const id of next.keys()) {
        if (!rows.has(id)) changed.add(id);
      }
      const nextOrder = [...next.keys()];
      const isReordered = [...rows.keys()].some((id, index) => id !== nextOrder[index]);
      rows = next;
      if (isReordered && changed.size === 0) changed.add('');
      announce(changed);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeRow: (id, listener) => {
      const held = rowListeners.get(id) ?? new Set<() => void>();
      held.add(listener);
      rowListeners.set(id, held);
      return () => {
        held.delete(listener);
      };
    },
    upsertRows: (incoming) => {
      const changed = new Set<string>();
      for (const row of incoming) {
        const held = rows.get(row.id);
        if (held !== undefined && isSameRow(held, row)) continue;
        rows.set(row.id, row);
        changed.add(row.id);
      }
      announce(changed);
    },
  };
};
