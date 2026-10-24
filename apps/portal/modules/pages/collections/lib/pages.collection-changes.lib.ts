import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { BOARD_LIVE_MAXIMUM_PAGES } from '../constants/pages.board-live.constants';
import type {
  ChangesBatch,
  ChangesController,
  ChangesControllerOptions,
  ChangesNotice,
  ChangesReadFailure,
} from '../types/pages.collection-changes.types';
import type { PageCollectionChanges } from '../types/pages.query.types';
import type { PageRow } from '../types/pages.schema.types';

/** Why a read of the changes cannot be used, or null when it can. */
const readRefusal = (read: PageCollectionChanges | null): ChangesReadFailure | null => {
  if (read === null) return 'changes-failed';
  if (read.isReset) return 'reset';
  return read.possiblyChangedIsTruncated ? 'linked-truncated' : null;
};

/** A row that a rollup may have changed is read again like one that changed: its computed values are fresh. */
const joinChanges = (rows: Map<string, PageRow>, trashed: Set<string>, read: PageCollectionChanges): void => {
  for (const row of [...read.possiblyChanged, ...read.rows]) rows.set(row.id, row);
  for (const id of read.trashedIds) trashed.add(id);
};

/**
 * Keeps a view in step with what others change. A burst of notices is read as one: the rows that changed come from
 * the changes of the collection, and the view says where each goes. What it cannot apply, it says why, and the view is
 * asked of the server again (the table in ADR 026).
 */
export const createChangesController = <Reason extends string>(
  options: ChangesControllerOptions<Reason>,
): ChangesController => {
  const held = new Map<string, number>();
  const pending = new Map<string, number>();
  let cursor = options.initialCursor;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let current: Promise<void> = Promise.resolve();
  let isDestroyed = false;

  const refresh = (reason: ChangesReadFailure | Reason): void => options.requestRefresh(reason);

  /** Null when a read failed or was cut; the reason it asked for a redraw has already been given. */
  const collectChanges = async (): Promise<ChangesBatch | null> => {
    const rows = new Map<string, PageRow>();
    const trashed = new Set<string>();
    let next = cursor;
    for (let page = 0; page < BOARD_LIVE_MAXIMUM_PAGES; page += 1) {
      const read = await options.readChanges(next);
      const refusal = readRefusal(read);
      if (read === null || refusal !== null) {
        refresh(refusal ?? 'changes-failed');
        return null;
      }
      options.onLookups(read);
      joinChanges(rows, trashed, read);
      next = read.cursor;
      if (!read.hasMore) {
        return { cursor: next, rows: [...rows.values()], total: read.total, trashedIds: [...trashed] };
      }
    }
    refresh('too-many-pages');
    return null;
  };

  const process = async (notices: ReadonlyMap<string, number>): Promise<void> => {
    const batch = await collectChanges();
    if (batch === null || isDestroyed) return;
    const failure = await options.apply(batch, () => !isDestroyed);
    if (failure !== null) {
      refresh(failure);
      return;
    }
    if (isDestroyed) return;
    cursor = batch.cursor;
    for (const [id, version] of notices) held.set(id, Math.max(held.get(id) ?? 0, version));
  };

  /** One batch that throws must not end the following: the view is drawn again and the next batch goes on. */
  const recoverFromFailure = (error: unknown): void => {
    browserLogger.error({ err: error }, 'The changes of a collection could not be applied');
    refresh('changes-failed');
  };

  const run = (): void => {
    timer = null;
    const batch = new Map(pending);
    pending.clear();
    if (batch.size === 0 || isDestroyed) return;
    current = current.then(() => process(batch)).catch(recoverFromFailure);
  };

  return {
    destroy: () => {
      isDestroyed = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending.clear();
    },
    flush: async () => {
      if (timer !== null) {
        clearTimeout(timer);
        run();
      }
      await current;
    },
    notify: (notices: readonly ChangesNotice[]) => {
      if (isDestroyed) return;
      for (const { id, version } of notices) {
        const isKnown = (held.get(id) ?? -1) >= version || (pending.get(id) ?? -1) >= version;
        if (!isKnown) pending.set(id, version);
      }
      if (pending.size > 0) timer ??= setTimeout(run, options.coalesceMs);
    },
    reset: (next) => {
      cursor = next;
    },
  };
};
