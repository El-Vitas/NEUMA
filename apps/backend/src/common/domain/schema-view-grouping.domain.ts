import type { DatabaseViewType } from '@company-brain/db';
import { canPagePropertyGroupBoard, pageViewRequiresGrouping, Result } from '@company-brain/shared';
import type {
  SchemaBoardColumn,
  SchemaGroupableRow,
  SchemaOrderedRow,
  SchemaPropertyDefinition,
} from './schema.domain.types';
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
  return property !== undefined && canPagePropertyGroupBoard(property.type) && property.options !== null
    ? property
    : null;
};

export const compareRowsByOrder = (left: SchemaOrderedRow, right: SchemaOrderedRow): number =>
  left.order - right.order || left.id.localeCompare(right.id);

export const groupRowsByBoard = <TRow extends SchemaGroupableRow>(
  viewType: DatabaseViewType,
  configuration: Readonly<Record<string, unknown>>,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly TRow[],
  compareRows: (left: TRow, right: TRow) => number = compareRowsByOrder,
): Result<readonly SchemaBoardColumn<TRow>[], SchemaViewValidationError> => {
  if (!pageViewRequiresGrouping(viewType)) return Result.fail(new SchemaViewValidationError('View is not a board'));
  const groupKey = getGroupKey(configuration);
  if (groupKey === null)
    return Result.fail(new SchemaViewValidationError('Board groupBy must reference a SELECT property'));
  const property = findGroupingProperty(properties, groupKey);
  if (property?.options == null) {
    return Result.fail(new SchemaViewValidationError('Board groupBy must reference a SELECT property'));
  }
  const columns = property.options.map((option) => ({ key: option, label: option, rows: [] as TRow[] }));
  const unassigned = { key: 'unassigned', label: 'Unassigned', rows: [] as TRow[] };
  const columnsByKey = new Map(columns.map((column) => [column.key, column]));
  for (const row of [...rows].sort(compareRows)) {
    const value = row.propertyValues[groupKey];
    const column = typeof value === 'string' ? columnsByKey.get(value) : undefined;
    (column ?? unassigned).rows.push(row);
  }
  return Result.ok([...columns, unassigned]);
};
