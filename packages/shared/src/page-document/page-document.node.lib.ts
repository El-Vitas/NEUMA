import { PAGE_DOCUMENT_NODES } from './page-document.structure.js';
import type { PageDocumentNodeShape, PageDocumentNodeStructure } from './page-document.types.js';

const NODE_STRUCTURES: Readonly<Partial<Record<string, PageDocumentNodeStructure>>> = PAGE_DOCUMENT_NODES;

export const readPageDocumentNodeStructure = (type: string): PageDocumentNodeStructure | undefined =>
  NODE_STRUCTURES[type];

export const isPageDocumentNode = (value: unknown): value is PageDocumentNodeShape =>
  typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';

/** An unknown block keeps its inner data loose (it may be a number or nothing), so non-nodes are filtered out here. */
export const listPageDocumentChildren = (node: PageDocumentNodeShape): readonly PageDocumentNodeShape[] =>
  (node.content ?? []).filter(isPageDocumentNode);

export const readPageDocumentText = (node: PageDocumentNodeShape, name: string): string | undefined => {
  const attribute = node.attrs?.[name];
  return typeof attribute === 'string' ? attribute : undefined;
};

export const readPageDocumentBlockId = (node: PageDocumentNodeShape): string | null =>
  readPageDocumentText(node, 'id') ?? null;
