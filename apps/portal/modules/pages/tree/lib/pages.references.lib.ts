import { PAGE_PROPERTY_TYPE, toValueList } from '@neuma/shared';
import type { PagePropertyValues, PageSchemaProperty } from '../../collections/types/pages.schema.types';
import type { PageContent, PageReference } from '../../types/pages.types';
import { PAGE_REFERENCE_NODE_TYPES, PAGE_SYNCED_NODE_TYPES } from '../constants/pages.tree.constants';
import type { PageBreadcrumbParent, PageContentNodeShape, PageTreeAncestor } from '../types/pages.tree.types';

const isContentNode = (value: unknown): value is PageContentNodeShape => typeof value === 'object' && value !== null;

const readPageId = (node: PageContentNodeShape, types: ReadonlySet<string>): string[] => {
  const pageId = node.attrs?.pageId;
  return typeof pageId === 'string' && typeof node.type === 'string' && types.has(node.type) ? [pageId] : [];
};

const walkNodes = (nodes: readonly unknown[], types: ReadonlySet<string>): string[] =>
  nodes.flatMap((node) => {
    if (!isContentNode(node)) return [];
    const below = Array.isArray(node.content) ? walkNodes(node.content, types) : [];
    return [...readPageId(node, types), ...below];
  });

const withoutRepeats = (ids: readonly string[]): string[] => [...new Set(ids)];

/** Every other page a document draws something from, so they can be asked for together when it opens. */
export const extractReferencedPageIds = (content: PageContent): string[] =>
  withoutRepeats(walkNodes(content.content, PAGE_REFERENCE_NODE_TYPES));

/** The pages whose blocks the document borrows: their content is needed to draw it. */
export const extractSyncedPageIds = (content: PageContent): string[] =>
  withoutRepeats(walkNodes(content.content, PAGE_SYNCED_NODE_TYPES));

/** The rows the relation cells of a row point to, which its properties panel names. */
export const listRelatedPageIds = (
  properties: readonly PageSchemaProperty[],
  propertyValues: PagePropertyValues | null,
): string[] =>
  withoutRepeats(
    properties
      .filter((property) => property.type === PAGE_PROPERTY_TYPE.RELATION)
      .flatMap((property) => toValueList(propertyValues?.[property.key] ?? [])),
  );

/** Only the ancestors the reader can open are named; the others leave no trace in a breadcrumb. */
export const toBreadcrumbParents = (ancestors: readonly PageTreeAncestor[]): readonly PageBreadcrumbParent[] =>
  ancestors.flatMap((ancestor) => (ancestor.isReadable ? [{ id: ancestor.id, title: ancestor.title }] : []));

/** The pages the page names, then the others the sidebar knows; a page is named once, as the first says it. */
export const mergePageReferences = (
  named: readonly PageReference[],
  others: readonly PageReference[],
): readonly PageReference[] => {
  const knownIds = new Set(named.map((reference) => reference.id));
  return [...named, ...others.filter((reference) => !knownIds.has(reference.id))];
};
