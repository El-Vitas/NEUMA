import { type PageFilter, readPageViewConfiguration } from '@neuma/shared';
import { MCP_CONFIGURED_UNREADABLE_NOTE, MCP_VALUELESS_FILTER_OPERATORS } from '../constants/mcp.constants';
import { MCP_CARD_VIEW_TYPES, MCP_SCALED_VIEW_TYPES } from '../constants/mcp.views.constants';
import type {
  McpCollectionOutput,
  McpColumn,
  McpOpenCollection,
  McpRowOutput,
  McpView,
} from '../types/mcp.collections.types';
import { buildMcpPageUrl } from './mcp.address.lib';
import { describeMcpRowPropertiesInOneLine } from './mcp.fetch.text.lib';

const nameColumn = (columns: readonly McpColumn[], key: string): string =>
  columns.find((column) => column.key === key)?.label ?? key;

/** A filter on options stores their ids; the agent reads the names people see. */
const nameOptionIn = (column: McpColumn | undefined, value: Extract<PageFilter, { kind: 'CONDITION' }>['value']) => {
  const named = (entry: string): string => column?.options?.find((option) => option.id === entry)?.value ?? entry;
  if (typeof value === 'string') return named(value);
  return Array.isArray(value) ? value.map(named) : value;
};

const describeCondition = (
  columns: readonly McpColumn[],
  filter: Extract<PageFilter, { kind: 'CONDITION' }>,
): string => {
  const column = nameColumn(columns, filter.propertyKey);
  if (MCP_VALUELESS_FILTER_OPERATORS.includes(filter.operator)) return `${column} ${filter.operator}`;
  const value = nameOptionIn(
    columns.find((candidate) => candidate.key === filter.propertyKey),
    filter.value,
  );
  return `${column} ${filter.operator} ${JSON.stringify(value)}`;
};

/** Nested groups are parenthesized. */
const describeFilter = (columns: readonly McpColumn[], filter: PageFilter, isNested: boolean): string => {
  if (filter.kind === 'CONDITION') return describeCondition(columns, filter);
  const joined = filter.conditions
    .map((condition) => describeFilter(columns, condition, true))
    .join(` ${filter.operator} `);
  return isNested ? `(${joined})` : joined;
};

/** A group without conditions filters nothing. */
const describeViewFilter = (columns: readonly McpColumn[], filter: PageFilter | null): string | null => {
  if (filter === null) return null;
  const described = describeFilter(columns, filter, false);
  return described === '' ? null : described;
};

/** Only what the view uses, so a table is not described by settings it ignores. */
const describeViewPlacement = (
  columns: readonly McpColumn[],
  view: McpView,
  configuration: ReturnType<typeof readPageViewConfiguration>,
): Partial<McpCollectionOutput['views'][number]> => ({
  ...(configuration.dateProperty === null ? {} : { dateColumn: nameColumn(columns, configuration.dateProperty) }),
  ...(configuration.endDateProperty === null
    ? {}
    : { endDateColumn: nameColumn(columns, configuration.endDateProperty) }),
  ...(configuration.coverProperty === null ? {} : { coverColumn: nameColumn(columns, configuration.coverProperty) }),
  ...(configuration.subGroupBy === null ? {} : { subGroupBy: nameColumn(columns, configuration.subGroupBy) }),
  ...(MCP_SCALED_VIEW_TYPES.includes(view.type) ? { scale: configuration.dateScale } : {}),
  ...(MCP_CARD_VIEW_TYPES.includes(view.type) ? { cardSize: configuration.cardSize } : {}),
});

const describeView = (columns: readonly McpColumn[], view: McpView): McpCollectionOutput['views'][number] => {
  const configuration = readPageViewConfiguration(view.configuration);
  return {
    filter: describeViewFilter(columns, configuration.filter),
    groupBy: configuration.groupBy === null ? null : nameColumn(columns, configuration.groupBy),
    isDefault: view.isDefault,
    name: view.name,
    type: view.type,
    ...describeViewPlacement(columns, view, configuration),
  };
};

/** A formula column says its text and a rollup column what it summarises, both with the type of what they give. */
const describeComputedColumn = (
  columns: readonly McpColumn[],
  column: McpColumn,
): { formula?: string; resultType?: string; rollup?: string } => {
  const formula = column.computed?.formula;
  if (formula !== null && formula !== undefined) return { formula: formula.source, resultType: formula.resultType };
  const rollup = column.computed?.rollup;
  if (rollup === null || rollup === undefined) return {};
  const relation = columns.find((candidate) => candidate.key === rollup.relationPropertyKey)?.label;
  return {
    resultType: rollup.resultType,
    rollup: `${rollup.calculation} of ${rollup.targetPropertyKey} over ${relation ?? rollup.relationPropertyKey}`,
  };
};

/** Everything is named as people see it. */
export const describeMcpCollection = (portalUrl: string, collection: McpOpenCollection): McpCollectionOutput => {
  const { properties, views } = collection.shape;
  return {
    columns: properties.map((column) => ({
      ...describeComputedColumn(properties, column),
      key: column.key,
      label: column.label,
      options: column.options === null ? null : column.options.map((option) => option.value),
      required: column.required,
      type: column.type,
    })),
    id: collection.id,
    title: collection.title,
    url: buildMcpPageUrl(portalUrl, collection.spaceId, collection.id, null),
    views: views.map((view) => describeView(properties, view)),
  };
};

const formatColumnLine = (column: McpCollectionOutput['columns'][number]): string => {
  const options = column.options === null ? '' : `: ${column.options.join(', ')}`;
  return `- ${column.label} (${column.key}, ${column.type})${options}`;
};

const formatViewLine = (view: McpCollectionOutput['views'][number]): string => {
  const traits = [
    ...(view.groupBy === null ? [] : [`grouped by ${view.groupBy}`]),
    ...(view.subGroupBy === undefined ? [] : [`in bands by ${view.subGroupBy}`]),
    ...(view.dateColumn === undefined ? [] : [`placed by ${view.dateColumn}`]),
    ...(view.endDateColumn === undefined ? [] : [`ending in ${view.endDateColumn}`]),
    ...(view.scale === undefined ? [] : [`by ${view.scale.toLowerCase()}`]),
    ...(view.coverColumn === undefined ? [] : [`covers from ${view.coverColumn}`]),
    ...(view.filter === null ? [] : [`where ${view.filter}`]),
  ];
  const kind = view.isDefault ? `${view.type}, default` : view.type;
  const said = traits.length === 0 ? '' : `: ${traits.join('; ')}`;
  return `- ${view.name} (${kind})${said}`;
};

export const formatMcpRowText = (row: McpRowOutput): string => {
  const properties = describeMcpRowPropertiesInOneLine(row.properties);
  const underneath = properties === '' ? '' : `\n  ${properties}`;
  return `- ${row.title} (row ${row.id}) ${row.url}${underneath}`;
};

/** A collection always has a title column, so zero columns means the token changed it without reading it. */
export const formatMcpCollectionText = (collection: McpCollectionOutput): string =>
  collection.columns.length === 0
    ? `${MCP_CONFIGURED_UNREADABLE_NOTE} ${collection.url}`
    : formatReadableCollectionText(collection);

const formatReadableCollectionText = (collection: McpCollectionOutput): string =>
  [
    `${collection.title} — ${collection.url}`,
    'Columns:',
    ...collection.columns.map(formatColumnLine),
    'Views:',
    ...collection.views.map(formatViewLine),
  ].join('\n');
