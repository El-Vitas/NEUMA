import {
  isPageDocumentNode,
  listPageDocumentChildren,
  type PageContent,
  pageContentSchema,
  Result,
  readPageDocumentBlockId,
} from '@neuma/shared';
import { MCP_CLOSED_BLOCKS_BLOCK_EDIT_MESSAGE } from '../constants/mcp.constants';
import { mcpDocumentNodesSchema } from '../schemas/mcp.common.schemas';
import type { McpContentEdit } from '../types/mcp.pages.types';
import type { McpCall, McpServerDependencies } from '../types/mcp.types';

const listNodeBlockIds = (nodes: readonly unknown[]): string[] =>
  nodes.filter(isPageDocumentNode).flatMap((node) => {
    const blockId = readPageDocumentBlockId(node);
    return [...(blockId === null ? [] : [blockId]), ...listNodeBlockIds(listPageDocumentChildren(node))];
  });

const hideClosedNodes = (nodes: readonly unknown[], readable: ReadonlySet<string>): unknown[] =>
  nodes.flatMap((node) => {
    if (!isPageDocumentNode(node)) return [node];
    const blockId = readPageDocumentBlockId(node);
    if (blockId !== null && !readable.has(blockId)) return [];
    return node.content === undefined ? [node] : [{ ...node, content: hideClosedNodes(node.content, readable) }];
  });

/** Ids of every block a stored document names, at any depth. A document that is not one names none. */
export const listMcpDocumentBlockIds = (document: unknown): string[] => {
  const parsed = mcpDocumentNodesSchema.safeParse(document);
  return parsed.success ? listNodeBlockIds(parsed.data.content) : [];
};

/** The document without the blocks `readable` leaves out, and without what hangs from them. */
export const hideClosedMcpBlocks = (document: unknown, readable: ReadonlySet<string>): unknown => {
  const parsed = mcpDocumentNodesSchema.safeParse(document);
  return parsed.success ? { ...parsed.data, content: hideClosedNodes(parsed.data.content, readable) } : document;
};

/** Which of the page's blocks the person behind the token may read: a token never reaches further than its owner. */
export const findMcpReadableBlockIds = (
  dependencies: McpServerDependencies,
  call: McpCall,
  document: unknown,
): Promise<ReadonlySet<string>> =>
  dependencies.blockAccess.findReadableBlockIds(listMcpDocumentBlockIds(document), {
    role: call.principal.role,
    userId: call.principal.userId,
    workspaceId: call.workspace.id,
  });

/**
 * A change names blocks of the page as the agent saw it. The change is tried on the page without the closed blocks
 * first, so naming one fails as naming a block that does not exist, and is then applied to the whole page so the
 * closed blocks stay where they are.
 */
export const hideClosedBlocksFromMcpEdit =
  (edit: McpContentEdit, readable: ReadonlySet<string>): McpContentEdit =>
  (current) => {
    const visible = pageContentSchema.safeParse(hideClosedMcpBlocks(current, readable));
    if (!visible.success) return Result.fail(MCP_CLOSED_BLOCKS_BLOCK_EDIT_MESSAGE);
    const attempt = edit(visible.data satisfies PageContent);
    return attempt.isFail() ? attempt : edit(current);
  };
