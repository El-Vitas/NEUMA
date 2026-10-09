import {
  isPageDocumentNode,
  listPageDocumentChildren,
  type PageDocumentNodeShape,
  type PageMark,
  Result,
  readPageDocumentBlockId,
  readPageDocumentText,
  readPageLinkAddress,
} from '@company-brain/shared';
import {
  MCP_BLOCK_REFERENCE_TYPES,
  MCP_INLINE_REFERENCE_TYPES,
  MCP_LABELED_REFERENCE_TYPES,
  MCP_REDACTED_REFERENCE_WORD,
  MCP_UNREACHABLE_REFERENCE_MESSAGE,
} from '../constants/mcp.constants';
import type { McpPagePlace, McpPerson } from '../types/mcp.types';
import { collectMcpResults } from './mcp.results.lib';

const pointsAtAPage = (node: PageDocumentNodeShape): boolean =>
  (MCP_INLINE_REFERENCE_TYPES.includes(node.type) || MCP_BLOCK_REFERENCE_TYPES.includes(node.type)) &&
  readPageDocumentText(node, 'pageId') !== undefined;

const readLinkedPageId = (mark: PageMark): string | null => {
  const href = mark.type === 'link' ? mark.attrs.href : undefined;
  return typeof href === 'string' ? (readPageLinkAddress(href)?.pageId ?? null) : null;
};

const listLinkedPageIds = (node: PageDocumentNodeShape): readonly string[] =>
  (node.marks ?? []).map(readLinkedPageId).filter((pageId) => pageId !== null);

const collectReferencedPageIds = (nodes: readonly unknown[]): readonly string[] =>
  nodes.filter(isPageDocumentNode).flatMap((node) => {
    const pageId = pointsAtAPage(node) ? readPageDocumentText(node, 'pageId') : undefined;
    const inside = collectReferencedPageIds(listPageDocumentChildren(node));
    return [...(pageId === undefined ? [] : [pageId]), ...listLinkedPageIds(node), ...inside];
  });

export const listReferencedPageIds = (nodes: readonly unknown[]): readonly string[] => [
  ...new Set(collectReferencedPageIds(nodes)),
];

const redactedBlock = (node: PageDocumentNodeShape): PageDocumentNodeShape => {
  const blockId = readPageDocumentBlockId(node);
  return {
    ...(blockId === null ? {} : { attrs: { id: blockId } }),
    content: [MCP_REDACTED_REFERENCE_WORD],
    type: 'paragraph',
  };
};

/** Mentions and subpages store the name and space from when written, stale after a rename or move. */
const bringUpToDate = (node: PageDocumentNodeShape, place: McpPagePlace): PageDocumentNodeShape => ({
  ...node,
  attrs: {
    ...node.attrs,
    ...(MCP_LABELED_REFERENCE_TYPES.includes(node.type) ? { label: place.title } : {}),
    spaceId: place.spaceId,
  },
});

const rewriteReference = (node: PageDocumentNodeShape, reachable: ReadonlyMap<string, McpPagePlace>): unknown => {
  const place = reachable.get(readPageDocumentText(node, 'pageId') ?? '');
  if (place !== undefined) return bringUpToDate(node, place);
  return MCP_INLINE_REFERENCE_TYPES.includes(node.type) ? MCP_REDACTED_REFERENCE_WORD : redactedBlock(node);
};

const dropUnreachableLinks = (
  node: PageDocumentNodeShape,
  reachable: ReadonlyMap<string, McpPagePlace>,
): PageDocumentNodeShape => {
  const marks = node.marks ?? [];
  const kept = marks.filter((mark) => {
    const pageId = readLinkedPageId(mark);
    return pageId === null || reachable.has(pageId);
  });
  if (kept.length === marks.length) return node;
  const { marks: _marks, ...rest } = node;
  return kept.length === 0 ? rest : { ...rest, marks: kept };
};

const hideNode = (node: unknown, reachable: ReadonlyMap<string, McpPagePlace>): unknown => {
  if (!isPageDocumentNode(node)) return node;
  if (pointsAtAPage(node)) return rewriteReference(node, reachable);
  const withoutLinks = dropUnreachableLinks(node, reachable);
  if (withoutLinks.content === undefined) return withoutLinks;
  return { ...withoutLinks, content: hideUnreachableReferences(withoutLinks.content, reachable) };
};

/**
 * A mention, subpage, synced block or collection would leak the title, id or content of an
 * unreadable page, so an unnamed mark replaces it; a block keeps its id so it stays addressable.
 */
export const hideUnreachableReferences = (
  nodes: readonly unknown[],
  reachable: ReadonlyMap<string, McpPagePlace>,
): readonly unknown[] => nodes.map((node) => hideNode(node, reachable));

const settleReference = (node: PageDocumentNodeShape, reachable: ReadonlyMap<string, McpPagePlace>) => {
  const place = reachable.get(readPageDocumentText(node, 'pageId') ?? '');
  return place === undefined
    ? Result.fail<PageDocumentNodeShape, string>(MCP_UNREACHABLE_REFERENCE_MESSAGE)
    : Result.ok<PageDocumentNodeShape, string>(bringUpToDate(node, place));
};

const settlePerson = (node: PageDocumentNodeShape, people: readonly McpPerson[]) => {
  const userId = readPageDocumentText(node, 'userId') ?? '';
  const person = people.find((candidate) => candidate.id === userId);
  return person === undefined
    ? Result.fail<unknown, string>(`There is nobody with id ${userId} in the workspace.`)
    : Result.ok<unknown, string>({ ...node, attrs: { ...node.attrs, label: person.name } });
};

const settleNode = (
  node: unknown,
  reachable: ReadonlyMap<string, McpPagePlace>,
  people: readonly McpPerson[],
): Result<unknown, string> => {
  if (!isPageDocumentNode(node)) return Result.ok(node);
  if (node.type === 'person') return settlePerson(node, people);
  const settled = pointsAtAPage(node)
    ? settleReference(node, reachable)
    : Result.ok<PageDocumentNodeShape, string>(node);
  if (settled.isFail() || settled.getValue().content === undefined) return settled;
  const own = settled.getValue();
  const inside = settleWrittenReferences(own.content ?? [], reachable, people);
  return inside.isFail() ? inside : Result.ok({ ...own, content: inside.getValue() });
};

/**
 * Only pages the token can reach may be referenced, or a mention, subpage or embedded
 * collection would expose a closed page's name or rows. Rejected like a missing page,
 * without echoing the name.
 */
export const settleWrittenReferences = (
  nodes: readonly unknown[],
  reachable: ReadonlyMap<string, McpPagePlace>,
  people: readonly McpPerson[],
): Result<unknown[], string> => collectMcpResults(nodes.map((node) => settleNode(node, reachable, people)));
