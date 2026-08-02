import type { WorkspaceCapability } from '@company-brain/shared';
import type { DatabaseBoardColumn, DatabaseProperty, DatabaseRecord, DatabaseView } from '../types/databases.types';

export const canManageDatabases = (capability: WorkspaceCapability): boolean => capability !== 'viewer';

export const getDatabaseViewType = (value: string): DatabaseView['type'] => (value === 'BOARD' ? 'BOARD' : 'TABLE');

export const getBoardGroupingProperty = (
  properties: readonly DatabaseProperty[],
  configuration: Readonly<Record<string, unknown>>,
): DatabaseProperty | null => {
  const groupBy = configuration.groupBy;
  if (typeof groupBy !== 'string') return null;

  const property = properties.find((candidate) => candidate.key === groupBy);
  return property?.type === 'SELECT' ? property : null;
};

export const groupRecordsBySelectProperty = (
  records: readonly DatabaseRecord[],
  property: DatabaseProperty,
): readonly DatabaseBoardColumn[] => {
  if (property.type !== 'SELECT' || property.options === null) return [];

  const grouped = new Map<string, DatabaseRecord[]>();
  for (const option of property.options) grouped.set(option, []);
  grouped.set('unassigned', []);

  for (const record of records) {
    const rawValue = record.propertyValues[property.key];
    const option = typeof rawValue === 'string' && grouped.has(rawValue) ? rawValue : 'unassigned';
    grouped.get(option)?.push(record);
  }

  return [...grouped.entries()].map(([key, groupedRecords]) => ({
    key,
    label: key,
    records: groupedRecords,
  }));
};

export const formatPropertyValue = (
  value: string | number | boolean | readonly string[] | undefined,
  labels: Readonly<{ empty: string; no: string; yes: string }>,
): string => {
  if (value === undefined) return labels.empty;
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? labels.yes : labels.no;
  return String(value);
};
