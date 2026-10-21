import { BOARD_LIVE_MAXIMUM_PAGES } from '../constants/pages.board-live.constants';
import type {
  BoardLiveController,
  BoardLiveNotice,
  BoardLiveOptions,
  BoardReadChanges,
  BoardRefreshReason,
} from '../types/pages.board-live.types';
import type { BoardColumnAddress } from '../types/pages.board-placement.types';
import type { PageCollectionChanges } from '../types/pages.query.types';
import type { PageRow, PageViewBand } from '../types/pages.schema.types';
import { placeChangedBoardRows, replaceBoardColumn } from './pages.board-placement.lib';

const countRowsIn = (bands: readonly PageViewBand[], address: BoardColumnAddress): number =>
  bands.find((band) => band.key === address.bandKey)?.groups.find((group) => group.key === address.groupKey)?.rows
    .length ?? 0;

/** Why a read of the changes cannot be used, or null when it can. */
const readRefusal = (read: PageCollectionChanges | null): BoardRefreshReason | null => {
  if (read === null) return 'changes-failed';
  return read.isReset ? 'reset' : null;
};

const joinChanges = (rows: Map<string, PageRow>, trashed: Set<string>, read: PageCollectionChanges): void => {
  for (const row of read.rows) rows.set(row.id, row);
  for (const id of read.trashedIds) trashed.add(id);
};

/**
 * Keeps a board in step with what others change without drawing it again from the server. A burst of notices is read
 * as one: the rows that changed come from the changes of the collection, and each goes where the engine of the server
 * says. What it cannot place, it says why and asks for the view to be drawn again (the table in ADR 026).
 */
export const createBoardLiveController = (options: BoardLiveOptions): BoardLiveController => {
  const held = new Map<string, number>();
  const pending = new Map<string, number>();
  let cursor = options.initialCursor;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let current: Promise<void> = Promise.resolve();
  let isDestroyed = false;

  const refresh = (reason: BoardRefreshReason): void => options.requestRefresh(reason);

  /** Null when a read failed or was cut; the reason it asked for a redraw has already been given. */
  const collectChanges = async (): Promise<BoardReadChanges | null> => {
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
      if (!read.hasMore) return { cursor: next, rows: [...rows.values()], trashedIds: [...trashed] };
    }
    refresh('too-many-pages');
    return null;
  };

  const readColumnsAgain = async (
    bands: readonly PageViewBand[],
    columns: readonly BoardColumnAddress[],
  ): Promise<readonly PageViewBand[] | null> => {
    const reads = await Promise.all(
      columns.map(async (address) => ({
        address,
        read: await options.readColumn(address, countRowsIn(bands, address) + 1),
      })),
    );
    if (reads.some(({ read }) => read === null)) return null;
    return reads.reduce(
      (state, { address, read }) => (read === null ? state : replaceBoardColumn(state, address, read)),
      bands,
    );
  };

  const process = async (notices: ReadonlyMap<string, number>): Promise<void> => {
    const changes = await collectChanges();
    if (changes === null || isDestroyed) return;
    const placement = placeChangedBoardRows({
      bands: options.readBands(),
      changedRows: changes.rows,
      context: options.readContext(),
      trashedIds: changes.trashedIds,
    });
    if (placement.kind === 'requery') {
      refresh(placement.reason);
      return;
    }
    const bands = await readColumnsAgain(placement.bands, placement.refreshColumns);
    if (bands === null) {
      refresh('column-failed');
      return;
    }
    if (isDestroyed) return;
    cursor = changes.cursor;
    for (const [id, version] of notices) held.set(id, Math.max(held.get(id) ?? 0, version));
    options.applyBands(bands);
    if (placement.isCountChanged || placement.refreshColumns.length > 0) options.onCountChanged();
  };

  const run = (): void => {
    timer = null;
    const batch = new Map(pending);
    pending.clear();
    if (batch.size === 0 || isDestroyed) return;
    current = current.then(() => process(batch));
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
    notify: (notices: readonly BoardLiveNotice[]) => {
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
