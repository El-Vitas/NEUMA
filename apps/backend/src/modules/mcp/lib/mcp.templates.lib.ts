import { type PageTemplateVariables, Result } from '@neuma/shared';
import type { McpNameLister, McpOpenCollection } from '../types/mcp.collections.types';
import type { McpStoredTemplate, McpTemplateListOutput, McpTemplateOutput } from '../types/mcp.templates.types';
import type { McpCall, McpPerson } from '../types/mcp.types';
import { describeMcpRowAsSeen } from './mcp.collections.lib';
import { foldMcpName, requireMcpColumn, sayMcpRefusalWithNames } from './mcp.columns.lib';
import { describeMcpRowPropertiesInOneLine } from './mcp.fetch.text.lib';

/** Named by id or by name: an id is exact, a name is read the way column names are, and must pick one template. */
export const pickMcpTemplate = (
  templates: readonly McpStoredTemplate[],
  reference: string,
  listNames: McpNameLister,
): Result<McpStoredTemplate, string> => {
  const byId = templates.find((template) => template.id === reference);
  if (byId !== undefined) return Result.ok(byId);
  const named = templates.filter((template) => foldMcpName(template.title) === foldMcpName(reference));
  const [only] = named;
  if (only !== undefined && named.length === 1) return Result.ok(only);
  const label = (template: McpStoredTemplate): string => `${template.title} (${template.id})`;
  if (named.length > 1) {
    const said = `More than one template is called "${reference}": name it by its id.`;
    return Result.fail(sayMcpRefusalWithNames(said, 'templates', named.map(label), listNames));
  }
  const said = `The collection has no template "${reference}".`;
  return Result.fail(sayMcpRefusalWithNames(said, 'templates', templates.map(label), listNames));
};

/** The word of each variable is kept by column key; the agent names columns, so they are resolved to keys. */
export const readMcpTemplateVariables = (
  collection: McpOpenCollection,
  variables: Readonly<Record<string, PageTemplateVariables[string]>>,
): Result<PageTemplateVariables, string> => {
  const resolved: Record<string, PageTemplateVariables[string]> = {};
  for (const [reference, word] of Object.entries(variables)) {
    const column = requireMcpColumn(collection.shape.properties, reference, collection.listNames);
    if (column.isFail()) return Result.fail(column.getError());
    resolved[column.getValue().key] = word;
  }
  return Result.ok(resolved);
};

export const describeMcpTemplate = (
  portalUrl: string,
  call: McpCall,
  collection: McpOpenCollection,
  people: readonly McpPerson[],
  template: McpStoredTemplate,
): McpTemplateOutput => {
  const described = describeMcpRowAsSeen(
    portalUrl,
    call,
    { place: collection.place, shape: collection.shape },
    { id: template.id, propertyValues: template.propertyValues, spaceId: collection.spaceId, title: template.title },
    people,
  );
  const labelOf = (key: string): string =>
    collection.shape.properties.find((column) => column.key === key)?.label ?? key;
  return {
    id: template.id,
    isDefault: template.isDefault,
    properties: described.properties,
    title: described.title,
    url: described.url,
    variables: Object.entries(template.variables).map(([key, word]) => ({ column: labelOf(key), key, word })),
  };
};

const formatTemplateLine = (template: McpTemplateOutput): string => {
  const values = describeMcpRowPropertiesInOneLine(template.properties);
  const filled = template.variables.map((variable) => `${variable.column} = ${variable.word}`).join(', ');
  const details = [values, filled].filter((part) => part !== '').join('; ');
  const mark = template.isDefault ? ' [default]' : '';
  const detailLine = details === '' ? '' : `\n  ${details}`;
  return `- ${template.title}${mark} (template ${template.id}) ${template.url}${detailLine}`;
};

export const formatMcpTemplateText = (template: McpTemplateOutput): string => formatTemplateLine(template);

export const formatMcpTemplateListText = (listing: McpTemplateListOutput): string =>
  listing.templates.length === 0
    ? `${listing.collection.title} has no templates.`
    : [`Templates of ${listing.collection.title}:`, ...listing.templates.map(formatTemplateLine)].join('\n');
