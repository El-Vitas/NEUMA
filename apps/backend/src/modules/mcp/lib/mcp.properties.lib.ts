import { DatabasePropertyType } from '@neuma/db';
import type { PageDateValue, PagePropertyValue, PagePropertyValues } from '@neuma/shared';
import { formatPageUniqueId, fractionToPercent, PAGE_NUMBER_FORMAT, readPageDateValue } from '@neuma/shared';
import { MCP_NO_ROW_LOOKUPS } from '../constants/mcp.constants';
import type { McpDescribedColumn, McpRowLookups } from '../types/mcp.collections.types';
import type { McpPerson, McpRowProperty } from '../types/mcp.types';

const listIds = (value: McpRowProperty['value']): readonly string[] => {
  if (typeof value === 'string') return [value];
  return Array.isArray(value) ? value : [];
};

const namePeople = (value: McpRowProperty['value'], people: ReadonlyMap<string, string>): McpPerson[] =>
  listIds(value).flatMap((id) => {
    const name = people.get(id);
    return name === undefined ? [] : [{ id, name }];
  });

/** A range is written as an interval, the way an agent gives it back. */
const writeDate = (date: PageDateValue): string => (date.end === undefined ? date.start : `${date.start}/${date.end}`);

const nameOptions = (column: McpDescribedColumn, ids: readonly string[]): string[] =>
  ids.flatMap((id) => column.options?.find((option) => option.id === id)?.value ?? []);

const asIds = (value: PagePropertyValue): readonly string[] => {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
  return typeof value === 'string' ? [value] : [];
};

const describeNumber = (column: McpDescribedColumn, value: number): number =>
  column.config?.numberFormat === PAGE_NUMBER_FORMAT.PERCENT ? fractionToPercent(value) : value;

const describeValue = (
  column: McpDescribedColumn,
  value: PagePropertyValue,
  lookups: McpRowLookups,
): McpRowProperty['value'] => {
  switch (column.type) {
    case DatabasePropertyType.SELECT:
    case DatabasePropertyType.STATUS:
      return nameOptions(column, asIds(value))[0] ?? null;
    case DatabasePropertyType.MULTI_SELECT:
      return nameOptions(column, asIds(value));
    case DatabasePropertyType.DATE:
    case DatabasePropertyType.CREATED_TIME:
    case DatabasePropertyType.EDITED_TIME: {
      const date = readPageDateValue(value);
      return date === null ? null : writeDate(date);
    }
    case DatabasePropertyType.NUMBER:
      return typeof value === 'number' ? describeNumber(column, value) : null;
    case DatabasePropertyType.UNIQUE_ID:
      return typeof value === 'number' ? formatPageUniqueId(column.config?.prefix ?? '', value) : null;
    case DatabasePropertyType.FILES:
      return asIds(value).flatMap((id) => lookups.files.get(id) ?? []);
    case DatabasePropertyType.PERSON:
    case DatabasePropertyType.RELATION:
      return [...asIds(value)];
    default:
      return typeof value === 'object' ? [...asIds(value)] : value;
  }
};

const describeRelated = (value: McpRowProperty['value'], lookups: McpRowLookups) =>
  listIds(value).flatMap((id) => {
    const title = lookups.rows.get(id);
    return title === undefined ? [] : [{ id, title }];
  });

const describeStored = (
  column: McpDescribedColumn,
  stored: PagePropertyValue | undefined,
  title: string,
  lookups: McpRowLookups,
): McpRowProperty['value'] => {
  if (column.type === DatabasePropertyType.TITLE) return title;
  return stored === undefined ? null : describeValue(column, stored, lookups);
};

const describeColumn = (
  column: McpDescribedColumn,
  values: PagePropertyValues | null,
  title: string,
  people: ReadonlyMap<string, string>,
  lookups: McpRowLookups,
): McpRowProperty => {
  const stored = values?.[column.key];
  const value = describeStored(column, stored, title, lookups);
  const described = { key: column.key, label: column.label, type: column.type, value };
  if (column.type === DatabasePropertyType.RELATION) return { ...described, related: describeRelated(value, lookups) };
  const isPersonal =
    column.type === DatabasePropertyType.PERSON ||
    column.type === DatabasePropertyType.CREATED_BY ||
    column.type === DatabasePropertyType.EDITED_BY;
  if (!isPersonal) return described;
  const named = namePeople(value, people);
  return { ...described, people: named };
};

/** Includes empty columns, since an empty value is information too. Values of deleted columns are dropped. */
export const describeMcpRowProperties = (
  columns: readonly McpDescribedColumn[],
  values: PagePropertyValues | null,
  title: string,
  people: ReadonlyMap<string, string>,
  lookups: McpRowLookups = MCP_NO_ROW_LOOKUPS,
): McpRowProperty[] => columns.map((column) => describeColumn(column, values, title, people, lookups));
