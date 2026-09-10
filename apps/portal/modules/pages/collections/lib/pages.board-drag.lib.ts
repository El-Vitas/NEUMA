import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import type {
  PageBoardDropSide,
  PageBoardDropTarget,
  PageBoardMove,
  PageBoardMoveDirection,
} from '../types/pages.board-drag.types';
import type { PageRow, PageViewGroup } from '../types/pages.schema.types';

/**
 * The value a card lands with when it is dropped on a column.
 *
 * The column of rows without a value is not a value of its own: dropping a card
 * there clears the property rather than writing the word «unassigned» into it.
 */
export const readBoardGroupValue = (groupKey: string): null | string =>
  groupKey === UNASSIGNED_GROUP_KEY ? null : groupKey;

/** Whether a card is being dropped somewhere that changes anything. */
export const isBoardDropAllowed = (fromGroupKey: null | string, toGroupKey: string): boolean =>
  fromGroupKey !== null && fromGroupKey !== toGroupKey;

/**
 * Cuál de los dos huecos de una tarjeta señala el cursor.
 *
 * Por encima de su mitad, el de arriba; por debajo, el de abajo. La mitad
 * exacta cuenta como el de abajo para que la marca no parpadee entre las dos
 * respuestas mientras la mano tiembla sobre el punto medio.
 */
export const readDropSideFromPointer = (
  pointerY: number,
  card: { readonly height: number; readonly top: number },
): PageBoardDropSide => (pointerY < card.top + card.height / 2 ? 'BEFORE' : 'AFTER');

/**
 * Lo que una fila creada dentro de una columna ya responde: la columna misma.
 *
 * Crear ahí es decir a cuál pertenece, así que nace con ese valor puesto y no
 * obliga a abrirla para repetir lo que el sitio donde se creó ya decía.
 */
export const buildNewRowPropertyValues = (groupByKey: string, groupKey: string): Readonly<Record<string, string>> => {
  const value = readBoardGroupValue(groupKey);
  return value === null ? {} : { [groupByKey]: value };
};

const findGroupOf = (groups: readonly PageViewGroup[], rowId: string): PageViewGroup | undefined =>
  groups.find((group) => group.rows.some((row) => row.id === rowId));

/**
 * Qué hace realmente soltar una tarjeta: con qué valor queda y delante de cuál.
 *
 * Devuelve nada cuando la tarjeta terminaría donde ya estaba —sobre sí misma, o
 * en el hueco que ella misma ocupaba—, porque escribir eso sería guardar un
 * cambio que nadie hizo.
 */
export const resolveBoardDrop = (
  groups: readonly PageViewGroup[],
  rowId: string,
  target: PageBoardDropTarget,
): null | PageBoardMove => {
  if (target.beforeRowId === rowId) return null;
  const from = findGroupOf(groups, rowId);
  if (from === undefined) return null;

  const changesGroup = from.key !== target.groupKey;
  if (!changesGroup && isTheGapItAlreadyOccupied(from, rowId, target.beforeRowId)) return null;

  return {
    beforeRowId: target.beforeRowId,
    changesGroup,
    changesOrder: true,
    propertyValue: changesGroup ? readBoardGroupValue(target.groupKey) : null,
  };
};

/**
 * Lo que la fila responde tras caer en su columna nueva.
 *
 * En la columna de las que no responden nada, la clave se va: dejarla escrita
 * en nada no es lo mismo que no haberla respondido, y es lo segundo lo que la
 * columna significa.
 */
export const withLandedValue = (row: PageRow, groupByKey: string, value: null | string): PageRow['propertyValues'] => {
  const current = { ...row.propertyValues };
  if (value === null) {
    delete current[groupByKey];
    return current;
  }
  return { ...current, [groupByKey]: value };
};

const insertAt = (rows: readonly PageRow[], row: PageRow, beforeRowId: null | string): readonly PageRow[] => {
  const at = beforeRowId === null ? -1 : rows.findIndex((candidate) => candidate.id === beforeRowId);
  if (at === -1) return [...rows, row];
  return [...rows.slice(0, at), row, ...rows.slice(at)];
};

/**
 * El tablero como quedará, dibujado antes de que el servidor conteste.
 *
 * Soltar una tarjeta y esperar a que vuelva la respuesta para verla moverse
 * hace que el gesto se sienta roto aunque haya funcionado. Se dibuja el
 * resultado enseguida y se corrige después con lo que el servidor diga, que es
 * la única verdad.
 */
export const applyBoardMoveToGroups = (
  groups: readonly PageViewGroup[],
  rowId: string,
  move: PageBoardMove,
  groupByKey: string,
): readonly PageViewGroup[] => {
  const from = findGroupOf(groups, rowId);
  const carried = from?.rows.find((row) => row.id === rowId);
  if (from === undefined || carried === undefined) return groups;

  const landing = move.changesGroup ? (move.propertyValue ?? UNASSIGNED_GROUP_KEY) : from.key;
  const arriving: PageRow = move.changesGroup
    ? { ...carried, propertyValues: withLandedValue(carried, groupByKey, move.propertyValue) }
    : carried;

  return groups.map((group) => {
    const without = group.rows.filter((row) => row.id !== rowId);
    if (group.key !== landing) return { ...group, rows: without };
    return { ...group, rows: insertAt(without, arriving, move.beforeRowId) };
  });
};

const isTheGapItAlreadyOccupied = (group: PageViewGroup, rowId: string, beforeRowId: null | string): boolean => {
  const at = group.rows.findIndex((row) => row.id === rowId);
  const following = group.rows[at + 1]?.id ?? null;
  return following === beforeRowId;
};

/**
 * The column a card reaches from the keyboard, or nothing when there is none.
 *
 * It stops at the ends instead of wrapping around, because a card that jumps
 * from the last column to the first has gone somewhere nobody aimed at.
 */
export const resolveBoardKeyboardTarget = (
  groups: readonly PageViewGroup[],
  fromGroupKey: string,
  direction: PageBoardMoveDirection,
): null | string => {
  const at = groups.findIndex((group) => group.key === fromGroupKey);
  if (at === -1) return null;
  const target = direction === 'FORWARD' ? at + 1 : at - 1;
  return groups[target]?.key ?? null;
};
