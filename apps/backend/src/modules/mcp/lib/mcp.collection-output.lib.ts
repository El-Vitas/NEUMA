import { type PageFilter, readPageViewConfiguration } from '@company-brain/shared';
import { MCP_VALUELESS_FILTER_OPERATORS } from '../constants/mcp.constants';
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

const describeCondition = (
  columns: readonly McpColumn[],
  filter: Extract<PageFilter, { kind: 'CONDITION' }>,
): string => {
  const column = nameColumn(columns, filter.propertyKey);
  if (MCP_VALUELESS_FILTER_OPERATORS.includes(filter.operator)) return `${column} ${filter.operator}`;
  return `${column} ${filter.operator} ${JSON.stringify(filter.value)}`;
};

/** Un filtro como se lee: las columnas por su nombre, y los grupos anidados entre paréntesis. */
const describeFilter = (columns: readonly McpColumn[], filter: PageFilter, isNested: boolean): string => {
  if (filter.kind === 'CONDITION') return describeCondition(columns, filter);
  const joined = filter.conditions
    .map((condition) => describeFilter(columns, condition, true))
    .join(` ${filter.operator} `);
  return isNested ? `(${joined})` : joined;
};

/** Lo que filtra una vista, o nada si no filtra: un grupo sin condiciones no filtra. */
const describeViewFilter = (columns: readonly McpColumn[], filter: PageFilter | null): string | null => {
  if (filter === null) return null;
  const described = describeFilter(columns, filter, false);
  return described === '' ? null : described;
};

const describeView = (columns: readonly McpColumn[], view: McpView): McpCollectionOutput['views'][number] => {
  const configuration = readPageViewConfiguration(view.configuration);
  return {
    filter: describeViewFilter(columns, configuration.filter),
    groupBy: configuration.groupBy === null ? null : nameColumn(columns, configuration.groupBy),
    isDefault: view.isDefault,
    name: view.name,
    type: view.type,
  };
};

/**
 * Una colección como la necesita el agente para trabajar con ella: cada
 * columna con lo que acepta, y cada vista con lo que agrupa y filtra, todo
 * nombrado como lo ve la gente.
 */
export const describeMcpCollection = (portalUrl: string, collection: McpOpenCollection): McpCollectionOutput => {
  const { properties, views } = collection.shape;
  return {
    columns: properties.map((column) => ({
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
    ...(view.filter === null ? [] : [`where ${view.filter}`]),
  ];
  const kind = view.isDefault ? `${view.type}, default` : view.type;
  return `- ${view.name} (${kind})${traits.length === 0 ? '' : `: ${traits.join('; ')}`}`;
};

/** Una fila en texto: su nombre, su id y su enlace, y debajo sus propiedades en una línea. */
export const formatMcpRowText = (row: McpRowOutput): string => {
  const properties = describeMcpRowPropertiesInOneLine(row.properties);
  return `- ${row.title} (row ${row.id}) ${row.url}${properties === '' ? '' : `\n  ${properties}`}`;
};

/** La colección en texto corto: qué columnas tiene, qué acepta cada una y qué vistas la muestran. */
export const formatMcpCollectionText = (collection: McpCollectionOutput): string =>
  [
    `${collection.title} — ${collection.url}`,
    'Columns:',
    ...collection.columns.map(formatColumnLine),
    'Views:',
    ...collection.views.map(formatViewLine),
  ].join('\n');
