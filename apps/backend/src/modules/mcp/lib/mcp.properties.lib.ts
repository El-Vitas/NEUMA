import { DatabasePropertyType } from '@neuma/db';
import type { PagePropertyValue, PagePropertyValues } from '@neuma/shared';
import type { McpSchemaColumn } from '../types/mcp.collections.types';
import type { McpPerson, McpRowProperty } from '../types/mcp.types';

const copyValue = (value: PagePropertyValue | undefined): McpRowProperty['value'] => {
  if (value === undefined) return null;
  return typeof value === 'object' ? [...value] : value;
};

const listIds = (value: McpRowProperty['value']): readonly string[] => {
  if (typeof value === 'string') return [value];
  return Array.isArray(value) ? value : [];
};

const namePeople = (value: McpRowProperty['value'], people: ReadonlyMap<string, string>): McpPerson[] =>
  listIds(value).flatMap((id) => {
    const name = people.get(id);
    return name === undefined ? [] : [{ id, name }];
  });

const describeColumn = (
  column: McpSchemaColumn,
  values: PagePropertyValues | null,
  title: string,
  people: ReadonlyMap<string, string>,
): McpRowProperty => {
  const value = column.type === DatabasePropertyType.TITLE ? title : copyValue(values?.[column.key]);
  const described = { key: column.key, label: column.label, type: column.type, value };
  return column.type === DatabasePropertyType.PERSON ? { ...described, people: namePeople(value, people) } : described;
};

/** Includes empty columns, since an empty value is information too. Values of deleted columns are dropped. */
export const describeMcpRowProperties = (
  columns: readonly McpSchemaColumn[],
  values: PagePropertyValues | null,
  title: string,
  people: ReadonlyMap<string, string>,
): McpRowProperty[] => columns.map((column) => describeColumn(column, values, title, people));
