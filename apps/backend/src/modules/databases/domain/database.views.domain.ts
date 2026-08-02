import { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import { Result } from '@company-brain/shared';
import type { DatabaseBoardColumn, DatabasePropertyDefinition, DatabaseRecordSummary } from './database.domain.types';
import { DatabaseViewValidationError } from './database.error';

const getGroupKey = (configuration: Readonly<Record<string, unknown>>): string | null => {
  const groupBy = configuration.groupBy;
  return typeof groupBy === 'string' ? groupBy : null;
};

export const groupRecordsByBoard = (
  viewType: DatabaseViewType,
  configuration: Readonly<Record<string, unknown>>,
  properties: readonly DatabasePropertyDefinition[],
  records: readonly DatabaseRecordSummary[],
): Result<readonly DatabaseBoardColumn[], DatabaseViewValidationError> => {
  if (viewType !== DatabaseViewType.BOARD) return Result.fail(new DatabaseViewValidationError('View is not a board'));
  const groupKey = getGroupKey(configuration);
  if (groupKey === null)
    return Result.fail(new DatabaseViewValidationError('Board groupBy must reference a SELECT property'));
  const property = properties.find((candidate) => candidate.key === groupKey);
  if (property === undefined || property.type !== DatabasePropertyType.SELECT || property.options === null) {
    return Result.fail(new DatabaseViewValidationError('Board groupBy must reference a SELECT property'));
  }
  const columns = property.options.map((option) => ({
    key: option,
    label: option,
    records: [] as DatabaseRecordSummary[],
  }));
  const unassigned = { key: 'unassigned', label: 'Unassigned', records: [] as DatabaseRecordSummary[] };
  const columnsByKey = new Map(columns.map((column) => [column.key, column]));
  for (const record of [...records].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )) {
    const value = record.propertyValues[groupKey];
    const column = typeof value === 'string' ? columnsByKey.get(value) : undefined;
    (column ?? unassigned).records.push(record);
  }
  return Result.ok([...columns, unassigned]);
};
