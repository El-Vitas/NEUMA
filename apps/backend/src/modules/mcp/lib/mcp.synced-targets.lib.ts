import { findPageBlock, isPageDocumentNode, readPageDocumentText } from '@company-brain/shared';
import { MCP_INACCESSIBLE_MESSAGE } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpCall, McpServerDependencies } from '../types/mcp.types';

const checkSource = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
  blockId: string,
): Promise<void> => {
  const { principal, workspace } = call;
  const source = await dependencies.pagesService.getAccessible(pageId, workspace.id, principal.userId, principal.role);
  if (source.isFail()) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  const { content } = source.getValue();
  const blocks = isPageDocumentNode(content) ? (content.content ?? []) : [];
  if (findPageBlock(blocks, blockId) === null)
    throw new McpToolError(
      `The page ${pageId} has no block ${blockId}. Read that page with fetch to find the block to show.`,
    );
};

const checkNode = async (dependencies: McpServerDependencies, call: McpCall, node: unknown): Promise<void> => {
  if (!isPageDocumentNode(node)) return;
  const pageId = readPageDocumentText(node, 'pageId');
  const blockId = readPageDocumentText(node, 'blockId');
  if (node.type === 'synced' && pageId !== undefined && blockId !== undefined)
    await checkSource(dependencies, call, pageId, blockId);
  await checkMcpSyncedTargets(dependencies, call, node.content ?? []);
};

/** Token access to the source page is checked earlier. */
export const checkMcpSyncedTargets = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  nodes: readonly unknown[],
): Promise<void> => {
  await Promise.all(nodes.map((node) => checkNode(dependencies, call, node)));
};
