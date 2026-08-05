import { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import { Result } from '@company-brain/shared';
import type { SchemaBoardColumn, SchemaGroupableRow, SchemaPropertyDefinition } from './schema.domain.types';
import { SchemaViewValidationError } from './schema.error';

const getGroupKey = (configuration: Readonly<Record<string, unknown>>): string | null => {
  const groupBy = configuration.groupBy;
  return typeof groupBy === 'string' ? groupBy : null;
};

const findGroupingProperty = (
  properties: readonly SchemaPropertyDefinition[],
  groupKey: string,
): SchemaPropertyDefinition | null => {
  const property = properties.find((candidate) => candidate.key === groupKey);
  return property !== undefined && property.type === DatabasePropertyType.SELECT && property.options !== null
    ? property
    : null;
};

const sortRowsForBoard = <TRow extends SchemaGroupableRow>(rows: readonly TRow[]): readonly TRow[] =>
  [...rows].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));

export const groupRowsByBoard = <TRow extends SchemaGroupableRow>(
  viewType: DatabaseViewType,
  configuration: Readonly<Record<string, unknown>>,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly TRow[],
): Result<readonly SchemaBoardColumn<TRow>[], SchemaViewValidationError> => {
  if (viewType !== DatabaseViewType.BOARD) return Result.fail(new SchemaViewValidationError('View is not a board'));
  const groupKey = getGroupKey(configuration);
  const property = groupKey === null ? null : findGroupingProperty(properties, groupKey);
  if (groupKey === null || property === null || property.options === null) {
    return Result.fail(new SchemaViewValidationError('Board groupBy must reference a SELECT property'));
  }
  const columns = property.options.map((option) => ({ key: option, label: option, rows: [] as TRow[] }));
  const unassigned = { key: 'unassigned', label: 'Unassigned', rows: [] as TRow[] };
  const columnsByKey = new Map(columns.map((column) => [column.key, column]));
  for (const row of sortRowsForBoard(rows)) {
    const value = row.propertyValues[groupKey];
    const column = typeof value === 'string' ? columnsByKey.get(value) : undefined;
    (column ?? unassigned).rows.push(row);
  }
  return Result.ok([...columns, unassigned]);
};
