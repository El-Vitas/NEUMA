import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import type { PageBoardGridDropTarget, PageBoardGridMove } from '../types/pages.board-drag.types';
import type { PageRow, PageViewBand } from '../types/pages.schema.types';
import { applyBoardMoveToGroups, readBoardGroupValue, resolveBoardDrop, withLandedValue } from './pages.board-drag.lib';

const findBandOf = (bands: readonly PageViewBand[], rowId: string): PageViewBand | undefined =>
  bands.find((band) => band.groups.some((group) => group.rows.some((row) => row.id === rowId)));

const findColumnKeyOf = (band: PageViewBand, rowId: string): string | undefined =>
  band.groups.find((group) => group.rows.some((row) => row.id === rowId))?.key;

/**
 * Qué hace soltar una tarjeta en un cruce de la rejilla: con qué dos valores
 * queda y delante de cuál.
 *
 * Dentro de la misma banda esto es el tablero de siempre, así que lo resuelve
 * quien ya sabía hacerlo. Cruzar a otra banda es lo único nuevo: además del
 * valor de la columna se escribe el de la banda, y la tarjeta cae al final del
 * cruce que la recibe salvo que el hueco diga otra cosa.
 */
export const resolveBoardGridDrop = (
  bands: readonly PageViewBand[],
  rowId: string,
  target: PageBoardGridDropTarget,
): null | PageBoardGridMove => {
  const from = findBandOf(bands, rowId);
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

/**
 * La rejilla como quedará, dibujada antes de que el servidor conteste.
 *
 * Sin cruzar de banda, la banda de siempre se rehace con lo que ya sabía
 * hacerlo. Cruzando, la tarjeta se va de una banda y aparece en la otra ya
 * respondiendo las dos cosas que su sitio nuevo significa: dibujarla en el
 * cruce sin cambiar lo que dice la dejaría diciendo una cosa y estando en otra.
 */
export const applyBoardMoveToBands = (
  bands: readonly PageViewBand[],
  rowId: string,
  move: PageBoardGridMove,
  groupByKey: string,
  subGroupByKey: string,
): readonly PageViewBand[] => {
  const from = findBandOf(bands, rowId);
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
