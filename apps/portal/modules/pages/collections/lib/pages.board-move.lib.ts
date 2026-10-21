import type { PageGroupByMode } from '@neuma/shared';
import {
  canPagePropertyGroupBoard,
  PAGE_GROUP_BY_MODE,
  PAGE_PROPERTY_TYPE,
  readPageEffectivePropertyType,
  UNASSIGNED_GROUP_KEY,
} from '@neuma/shared';
import type { PageBoardGridDropTarget } from '../types/pages.board-drag.types';
import type {
  BoardAxisInput,
  BoardAxisWrite,
  BoardMoveWrite,
  BoardValuesInput,
  PageBoardAnchor,
} from '../types/pages.board-move.types';
import type { PagePropertyValue, PageSchemaProperty, PageViewBand } from '../types/pages.schema.types';
import { toGroupPropertyValue } from './pages.group-values.lib';

const isListProperty = (property: PageSchemaProperty | undefined): boolean =>
  property?.type === PAGE_PROPERTY_TYPE.MULTI_SELECT || property?.type === PAGE_PROPERTY_TYPE.PERSON;

const findColumn = (bands: readonly PageViewBand[], bandKey: string, groupKey: string) =>
  bands.find((band) => band.key === bandKey)?.groups.find((group) => group.key === groupKey);

/**
 * The card goes before the one the pointer was on, or at the end of the column, which is after the last card the
 * column shows. A column that is empty has no neighbour, and then the card keeps the place it had in the view.
 */
export const resolveBoardAnchor = (
  bands: readonly PageViewBand[],
  rowId: string,
  target: PageBoardGridDropTarget,
): PageBoardAnchor => {
  if (target.beforeRowId !== null) return { before: target.beforeRowId };
  const last = findColumn(bands, target.bandKey, target.groupKey)?.rows.findLast((row) => row.id !== rowId);
  return last === undefined ? {} : { after: last.id };
};

/** A column of a status grouped by its three groups is a group, and the card takes the first option of it. */
const toColumnValue = (
  grouping: PageSchemaProperty,
  mode: PageGroupByMode,
  properties: readonly PageSchemaProperty[],
  columnKey: string,
): PagePropertyValue | null => {
  if (mode === PAGE_GROUP_BY_MODE.GROUP && grouping.type === PAGE_PROPERTY_TYPE.STATUS) {
    return grouping.options?.find((option) => option.group === columnKey)?.id ?? null;
  }
  return toGroupPropertyValue(properties, grouping.key, columnKey);
};

/** What one axis of the board writes when the card lands: the column's value, or what leaves and enters its list. */
const writeOnAxis = ({ from, mode, properties, property, to }: BoardAxisInput): BoardAxisWrite => {
  if (property === undefined) return { kind: 'value', value: null };
  const left = from === UNASSIGNED_GROUP_KEY ? null : from;
  if (isListProperty(property)) {
    return { change: { add: to === null ? [] : [to], remove: left === null ? [] : [left] }, kind: 'list' };
  }
  return { kind: 'value', value: to === null ? null : toColumnValue(property, mode, properties, to) };
};

const addAxisWrite = (write: BoardMoveWrite, key: string, axisWrite: BoardAxisWrite): BoardMoveWrite =>
  axisWrite.kind === 'list'
    ? { ...write, listChanges: { ...write.listChanges, [key]: axisWrite.change } }
    : { ...write, values: { ...write.values, [key]: axisWrite.value } };

/** What a drop writes: the column's, and the band's when the card crossed bands, in the form each holds. */
export const buildBoardMoveValues = ({
  fromBandKey,
  fromGroupKey,
  groupByKey,
  mode,
  move,
  properties,
  subGroupByKey,
}: BoardValuesInput): BoardMoveWrite => {
  const grouping = properties.find((property) => property.key === groupByKey);
  const banding = properties.find((property) => property.key === subGroupByKey);
  const changesColumn =
    move.changesGroup && grouping !== undefined && canPagePropertyGroupBoard(readPageEffectivePropertyType(grouping));
  const afterColumn = changesColumn
    ? addAxisWrite(
        { listChanges: {}, values: {} },
        groupByKey,
        writeOnAxis({ from: fromGroupKey, mode, properties, property: grouping, to: move.propertyValue }),
      )
    : { listChanges: {}, values: {} };
  return move.changesBand && subGroupByKey !== ''
    ? addAxisWrite(
        afterColumn,
        subGroupByKey,
        writeOnAxis({
          from: fromBandKey,
          mode: PAGE_GROUP_BY_MODE.OPTION,
          properties,
          property: banding,
          to: move.bandValue,
        }),
      )
    : afterColumn;
};
