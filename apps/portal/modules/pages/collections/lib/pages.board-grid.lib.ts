import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import type { PageBoardGridDropTarget, PageBoardGridMove } from '../types/pages.board-drag.types';
import type { PageRow, PageViewBand } from '../types/pages.schema.types';
import { applyBoardMoveToGroups, readBoardGroupValue, resolveBoardDrop, withLandedValue } from './pages.board-drag.lib';

export const findBandHoldingRow = (bands: readonly PageViewBand[], rowId: string): PageViewBand | undefined =>
  bands.find((band) => band.groups.some((group) => group.rows.some((row) => row.id === rowId)));

const findColumnKeyOf = (band: PageViewBand, rowId: string): string | undefined =>
  band.groups.find((group) => group.rows.some((row) => row.id === rowId))?.key;

/** Within a band this is the plain board drop; crossing bands also writes the band value. */
export const resolveBoardGridDrop = (
  bands: readonly PageViewBand[],
  rowId: string,
  target: PageBoardGridDropTarget,
): null | PageBoardGridMove => {
  const from = findBandHoldingRow(bands, rowId);
  if (from === undefined) return null;
  if (from.key === target.bandKey) {
    const move = resolveBoardDrop(from.groups, rowId, target);
    return move === null ? null : { ...move, bandValue: null, changesBand: false };
  }
  const fromColumnKey = findColumnKeyOf(from, rowId);
  return {
    bandValue: readBoardGroupValue(target.bandKey),
    beforeRowId: target.beforeRowId,
    changesBand: true,
    changesGroup: fromColumnKey !== target.groupKey,
    changesOrder: true,
    propertyValue: readBoardGroupValue(target.groupKey),
  };
};

const withoutTheRow = (band: PageViewBand, rowId: string): PageViewBand => ({
  ...band,
  groups: band.groups.map((group) => ({ ...group, rows: group.rows.filter((row) => row.id !== rowId) })),
});

const insertInto = (band: PageViewBand, row: PageRow, move: PageBoardGridMove): PageViewBand => ({
  ...band,
  groups: band.groups.map((group) => {
    if (group.key !== (move.propertyValue ?? UNASSIGNED_GROUP_KEY)) return group;
    const at = move.beforeRowId === null ? -1 : group.rows.findIndex((candidate) => candidate.id === move.beforeRowId);
    return {
      ...group,
      rows: at === -1 ? [...group.rows, row] : [...group.rows.slice(0, at), row, ...group.rows.slice(at)],
    };
  }),
});

/** Optimistic result. Across bands the card also gets both new values so it does not show one thing and say another. */
export const applyBoardMoveToBands = (
  bands: readonly PageViewBand[],
  rowId: string,
  move: PageBoardGridMove,
  groupByKey: string,
  subGroupByKey: string,
): readonly PageViewBand[] => {
  const from = findBandHoldingRow(bands, rowId);
  const carried = from?.groups.flatMap((group) => group.rows).find((row) => row.id === rowId);
  if (from === undefined || carried === undefined) return bands;
  if (!move.changesBand) {
    return bands.map((band) =>
      band.key === from.key ? { ...band, groups: applyBoardMoveToGroups(band.groups, rowId, move, groupByKey) } : band,
    );
  }
  const landing: PageRow = {
    ...carried,
    propertyValues: withLandedValue(
      { ...carried, propertyValues: withLandedValue(carried, groupByKey, move.propertyValue) },
      subGroupByKey,
      move.bandValue,
    ),
  };
  return bands.map((band) => {
    if (band.key === from.key) return withoutTheRow(band, rowId);
    if (band.key === (move.bandValue ?? UNASSIGNED_GROUP_KEY))
      return insertInto(withoutTheRow(band, rowId), landing, move);
    return band;
  });
};
