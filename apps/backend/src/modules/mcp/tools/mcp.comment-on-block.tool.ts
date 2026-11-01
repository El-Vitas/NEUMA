import { ACCESS_TOKEN_PERMISSIONS, describeMissingPageBlock, findPageBlock, type PageContent } from '@neuma/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { checkMcpQuote, markMcpQuote, readMcpStoredContent } from '../lib/mcp.comments.lib';
import { openMcpPage, readMcpPageId, requireMcpInput, requireMcpSuccess } from '../lib/mcp.page-access.lib';
import { describeMcpWrittenBlocks, formatMcpWrittenBlocksText, writeMcpContent } from '../lib/mcp.page-writes.lib';
import { commentedBlockOutputSchema, commentOnBlockInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpCommentedBlockOutput, McpCommentOnBlockInput } from '../types/mcp.pages.types';
import type { McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const requireBlock = (content: PageContent, blockId: string): void => {
  if (findPageBlock(content.content, blockId) === null) throw new McpToolError(describeMissingPageBlock(blockId));
};

const commentOnBlock = async (
  dependencies: McpServerDependencies,
  input: McpCommentOnBlockInput,
  { call, record }: McpWriteSession,
): Promise<McpCommentedBlockOutput> => {
  const opened = await openMcpPage(dependencies, call, readMcpPageId(input.page), ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  const current = readMcpStoredContent(opened.page.content);
  requireBlock(current, input.block);
  if (input.quote !== undefined) requireMcpInput(checkMcpQuote(current, input.block, input.quote));
  const request = {
    blockIds: [input.block],
    detail: { quoted: input.quote !== undefined },
    pageId: opened.page.id,
    tool: MCP_TOOL_NAMES.commentOnBlock,
  };
  const { content, discussion } = await record(request, async () => {
    const created = requireMcpSuccess(
      await dependencies.discussions.openDiscussion(call.viewer, input.block, {
        body: [{ insert: input.text }],
        quote: input.quote,
      }),
    );
    if (input.quote === undefined) return { content: current, discussion: created };
    const marked = await writeMcpContent(
      dependencies,
      call,
      opened.page,
      markMcpQuote(input.block, input.quote, created.id),
    );
    return { content: marked, discussion: created };
  });
  const written = await describeMcpWrittenBlocks(dependencies, call, { ...opened, content }, [input.block]);
  const [first] = discussion.comments;
  if (first === undefined) throw new Error(`Discussion ${discussion.id} was created without a comment`);
  return {
    ...written,
    comment: {
      author: first.authorName,
      blockId: input.block,
      createdAt: first.createdAt,
      discussionId: discussion.id,
      id: first.id,
      isDeleted: false,
      text: input.text,
    },
  };
};

export const commentOnBlockTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.commentOnBlock,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.commentOnBlock,
      {
        description:
          'Start a discussion on one block of a page, signed as the person who owns this token, the way a person comments from the block menu: on the whole block, or on some of its words given in quote, which get marked. Comments are for remarks and questions about a block; they do not change what it says. People continue the discussion by replying, and so can you with reply_to_discussion. Returns the block with the comment id and the discussion id.',
        inputSchema: commentOnBlockInputSchema,
        outputSchema: commentedBlockOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { requestId: input.requestId, target: input.page, tool: MCP_TOOL_NAMES.commentOnBlock },
          (session) => commentOnBlock(dependencies, input, session),
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
