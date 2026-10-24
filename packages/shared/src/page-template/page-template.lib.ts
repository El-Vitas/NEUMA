import type { PagePropertyValues } from '../page-property/page-property.types.js';
import { readPageLocalDay } from '../page-view/page-view.zone.lib.js';
import type { PageContent } from '../schemas/page-content.schema.js';
import { PAGE_PROPERTY_TYPE, type PagePropertyType } from '../types/page-schema.types.js';
import {
  PAGE_DEFAULT_TEMPLATE_KEY,
  PAGE_TEMPLATE_KEY,
  PAGE_TEMPLATE_VARIABLE,
  PAGE_TEMPLATE_VARIABLE_VALUES,
} from './page-template.constants.js';
import type {
  PageTemplateMarker,
  PageTemplateVariable,
  PageTemplateVariables,
  PageTemplateViewer,
} from './page-template.types.js';

interface TemplateColumn {
  readonly key: string;
  readonly type: PagePropertyType;
}

const isRecord = (candidate: unknown): candidate is Readonly<Record<string, unknown>> =>
  typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);

const isTemplateVariable = (candidate: unknown): candidate is PageTemplateVariable =>
  PAGE_TEMPLATE_VARIABLE_VALUES.some((variable) => variable === candidate);

/** The marker of a template page; null for any other page. A variable this version does not know is left out. */
export const readPageTemplate = (properties: unknown): PageTemplateMarker | null => {
  if (!isRecord(properties)) return null;
  const marker = properties[PAGE_TEMPLATE_KEY];
  if (!isRecord(marker)) return null;
  const stored = isRecord(marker.variables) ? marker.variables : {};
  const variables: Record<string, PageTemplateVariable> = {};
  for (const [key, variable] of Object.entries(stored)) {
    if (isTemplateVariable(variable)) variables[key] = variable;
  }
  return { variables };
};

export const isPageTemplate = (properties: unknown): boolean => readPageTemplate(properties) !== null;

/** The template new rows of a collection start from, if its collection names one. */
export const readPageDefaultTemplateId = (properties: unknown): string | null => {
  if (!isRecord(properties)) return null;
  const templateId = properties[PAGE_DEFAULT_TEMPLATE_KEY];
  return typeof templateId === 'string' && templateId !== '' ? templateId : null;
};

const isBlankNode = (node: unknown): boolean => {
  if (!isRecord(node) || node.type !== 'paragraph') return false;
  const children = Array.isArray(node.content) ? node.content : [];
  return children.every((child) => isRecord(child) && child.type === 'text' && child.text === '');
};

/** A document a new page starts with: nothing in it but empty paragraphs. */
export const isPageContentBlank = (content: PageContent): boolean => content.content.every(isBlankNode);

const FITS: Readonly<Record<PageTemplateVariable, PagePropertyType>> = {
  [PAGE_TEMPLATE_VARIABLE.ME]: PAGE_PROPERTY_TYPE.PERSON,
  [PAGE_TEMPLATE_VARIABLE.TODAY]: PAGE_PROPERTY_TYPE.DATE,
};

/** A message naming the first variable that does not fit its column, or null when all do. */
export const findInvalidPageTemplateVariable = (
  variables: PageTemplateVariables,
  columns: readonly TemplateColumn[],
): string | null => {
  for (const [key, variable] of Object.entries(variables)) {
    const column = columns.find((candidate) => candidate.key === key);
    if (column === undefined) return `"${key}" is not a column of the collection`;
    if (column.type !== FITS[variable]) return `${variable} does not fit the column "${key}" (${column.type})`;
  }
  return null;
};

const resolveVariable = (variable: PageTemplateVariable, viewer: PageTemplateViewer): PagePropertyValues[string] =>
  variable === PAGE_TEMPLATE_VARIABLE.TODAY
    ? { start: readPageLocalDay(viewer.now, viewer.timeZone) }
    : [viewer.viewerId];

/** The values the variables stand for today and for this person; a column that is gone is skipped. */
export const resolvePageTemplateVariables = (
  variables: PageTemplateVariables,
  columns: readonly TemplateColumn[],
  viewer: PageTemplateViewer,
): PagePropertyValues =>
  Object.fromEntries(
    Object.entries(variables)
      .filter(([key]) => columns.some((column) => column.key === key))
      .map(([key, variable]) => [key, resolveVariable(variable, viewer)]),
  );
