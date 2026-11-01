import type { BoardLiveController, BoardLiveOptions, BoardRefreshReason } from '../types/pages.board-live.types';
import type { BoardColumnAddress } from '../types/pages.board-placement.types';
import type { PageViewBand } from '../types/pages.schema.types';
import { placeChangedBoardRows, replaceBoardColumn } from './pages.board-placement.lib';
import { createChangesController } from './pages.collection-changes.lib';

const countRowsIn = (bands: readonly PageViewBand[], address: BoardColumnAddress): number =>
  bands.find((band) => band.key === address.bandKey)?.groups.find((group) => group.key === address.groupKey)?.rows
    .length ?? 0;

const readColumnsAgain = async (
  options: BoardLiveOptions,
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

/**
 * Keeps the bands of a view in step with what others change without drawing them again from the server. Each changed
 * row goes where the engine of the server says; what the browser cannot place, it says why and asks for the view to be
 * drawn again (the table in ADR 026).
 */
export const createBoardLiveController = (options: BoardLiveOptions): BoardLiveController =>
  createChangesController<BoardRefreshReason>({
    apply: async (batch, isActive) => {
      const placement = placeChangedBoardRows({
        bands: options.readBands(),
        changedRows: batch.rows,
        context: options.readContext(),
        trashedIds: batch.trashedIds,
      });
      if (placement.kind === 'requery') return placement.reason;
      const bands = await readColumnsAgain(options, placement.bands, placement.refreshColumns);
      if (bands === null) return 'column-failed';
      if (!isActive()) return null;
      options.applyBands(bands);
      if (placement.isCountChanged || placement.refreshColumns.length > 0) options.onCountChanged();
      return null;
    },
    coalesceMs: options.coalesceMs,
    initialCursor: options.initialCursor,
    onLookups: options.onLookups,
    readChanges: options.readChanges,
    requestRefresh: options.requestRefresh,
  });
