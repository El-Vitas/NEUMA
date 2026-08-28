import type { DatabaseViewType } from '@company-brain/db';
import {
  canPagePropertyGroupBoard,
  pageViewRequiresGrouping,
  Result,
  UNASSIGNED_GROUP_KEY,
} from '@company-brain/shared';
import type {
  SchemaGroupableRow,
  SchemaOrderedRow,
  SchemaPropertyDefinition,
  SchemaRowGroup,
} from './schema.domain.types';
import { SchemaViewValidationError } from './schema.error';
import { UNASSIGNED_GROUP_LABEL } from './schema-view.constants';

const getGroupKey = (configuration: Readonly<Record<string, unknown>>): string | null => {
  const groupBy = configuration.groupBy;
  return typeof groupBy === 'string' ? groupBy : null;
};

const findGroupingProperty = (
  properties: readonly SchemaPropertyDefinition[],
  groupKey: string,
): SchemaPropertyDefinition | null => {
  const property = properties.find((candidate) => candidate.key === groupKey);
  return property !== undefined && canPagePropertyGroupBoard(property.type) && property.options !== null
    ? property
    : null;
};

export const compareRowsByOrder = (left: SchemaOrderedRow, right: SchemaOrderedRow): number =>
  left.order - right.order || left.id.localeCompare(right.id);

/**
 * The rows of a view gathered by the value they carry, one group per option the
 * grouping property offers, plus one for whoever carries no value at all.
 *
 * Every option gets its group even when nothing landed in it, because an empty
 * column that exists is a place to drop something and an absent one is not.
 */
export const groupRowsForView = <TRow extends SchemaGroupableRow>(
  viewType: DatabaseViewType,
  configuration: Readonly<Record<string, unknown>>,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly TRow[],
  compareRows: (left: TRow, right: TRow) => number = compareRowsByOrder,
): Result<readonly SchemaRowGroup<TRow>[], SchemaViewValidationError> => {
  if (!pageViewRequiresGrouping(viewType))
    return Result.fail(new SchemaViewValidationError('View does not read its rows in groups'));
  const groupKey = getGroupKey(configuration);
  if (groupKey === null)
    return Result.fail(new SchemaViewValidationError('Board groupBy must reference a SELECT property'));
  const property = findGroupingProperty(properties, groupKey);
  if (property?.options == null) {
    return Result.fail(new SchemaViewValidationError('Board groupBy must reference a SELECT property'));
  }
  const groups = property.options.map((option) => ({
    color: option.color,
    key: option.value,
    label: option.value,
    rows: [] as TRow[],
  }));
  const unassigned = { color: null, key: UNASSIGNED_GROUP_KEY, label: UNASSIGNED_GROUP_LABEL, rows: [] as TRow[] };
  const groupsByKey = new Map(groups.map((group) => [group.key, group]));
  for (const row of [...rows].sort(compareRows)) {
    const value = row.propertyValues[groupKey];
    const group = typeof value === 'string' ? groupsByKey.get(value) : undefined;
    (group ?? unassigned).rows.push(row);
  }
  return Result.ok([...groups, unassigned]);
};
