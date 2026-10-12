import { DatabasePropertyType, type DatabaseViewType } from '@neuma/db';
import type { PageDateBucket } from '@neuma/shared';
import {
  canPagePropertyGroupBoard,
  PAGE_DATE_BUCKET,
  PAGE_DATE_BUCKET_VALUES,
  pageViewSupportsGrouping,
  Result,
  readPageDateBucketKey,
  UNASSIGNED_GROUP_KEY,
} from '@neuma/shared';
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

const getDateBucket = (configuration: Readonly<Record<string, unknown>>): PageDateBucket => {
  const bucket = configuration.groupByDateBucket;
  return PAGE_DATE_BUCKET_VALUES.find((candidate) => candidate === bucket) ?? PAGE_DATE_BUCKET.DAY;
};

const findGroupingProperty = (
  properties: readonly SchemaPropertyDefinition[],
  groupKey: string,
): SchemaPropertyDefinition | null => {
  const property = properties.find((candidate) => candidate.key === groupKey);
  return property !== undefined && canPagePropertyGroupBoard(property.type) ? property : null;
};

/** Keys are text, so numbers and booleans are stringified; anything else lands in the no-value group. */
const readGroupKeyFrom = (value: unknown): null | string => {
  if (typeof value === 'string') return value === '' ? null : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

/** For dates the key is the bucket's; the row still stores the exact day. */
const readGroupKeyOf = (property: SchemaPropertyDefinition, bucket: PageDateBucket, value: unknown): null | string => {
  const named = readGroupKeyFrom(value);
  if (named === null || property.type !== DatabasePropertyType.DATE) return named;
  return readPageDateBucketKey(named, bucket);
};

/** Columns come from the values rows actually hold, sorted; a checkbox always offers both answers. */
const listUndeclaredGroupKeys = (
  property: SchemaPropertyDefinition,
  bucket: PageDateBucket,
  rows: readonly SchemaGroupableRow[],
): readonly string[] => {
  if (property.type === DatabasePropertyType.CHECKBOX) return ['true', 'false'];
  const named = new Set<string>();
  for (const row of rows) {
    const key = readGroupKeyOf(property, bucket, row.propertyValues[property.key]);
    if (key !== null) named.add(key);
  }
  return [...named].sort((left, right) => left.localeCompare(right));
};

export const compareRowsByOrder = (left: SchemaOrderedRow, right: SchemaOrderedRow): number =>
  left.order - right.order || left.id.localeCompare(right.id);

/** Every option gets a group even when empty, so it stays a drop target; rows without a value get their own group. */
export const groupRowsForView = <TRow extends SchemaGroupableRow>(
  viewType: DatabaseViewType,
  configuration: Readonly<Record<string, unknown>>,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly TRow[],
  compareRows: (left: TRow, right: TRow) => number = compareRowsByOrder,
): Result<readonly SchemaRowGroup<TRow>[], SchemaViewValidationError> => {
  // Supporting grouping is enough: a table groups only when asked to.
  if (!pageViewSupportsGrouping(viewType))
    return Result.fail(new SchemaViewValidationError('View does not read its rows in groups'));
  const groupKey = getGroupKey(configuration);
  if (groupKey === null) return Result.fail(new SchemaViewValidationError('groupBy must name a property'));
  const property = findGroupingProperty(properties, groupKey);
  if (property === null) {
    return Result.fail(new SchemaViewValidationError('groupBy must reference a property that can make groups'));
  }
  const bucket = getDateBucket(configuration);
  const groups =
    property.options === null
      ? listUndeclaredGroupKeys(property, bucket, rows).map((key) => ({
          color: null,
          key,
          label: key,
          rows: [] as TRow[],
        }))
      : property.options.map((option) => ({
          color: option.color,
          key: option.value,
          label: option.value,
          rows: [] as TRow[],
        }));
  const unassigned = { color: null, key: UNASSIGNED_GROUP_KEY, label: UNASSIGNED_GROUP_LABEL, rows: [] as TRow[] };
  const groupsByKey = new Map(groups.map((group) => [group.key, group]));
  for (const row of [...rows].sort(compareRows)) {
    const value = readGroupKeyOf(property, bucket, row.propertyValues[groupKey]);
    const group = value === null ? undefined : groupsByKey.get(value);
    (group ?? unassigned).rows.push(row);
  }
  return Result.ok([...groups, unassigned]);
};
