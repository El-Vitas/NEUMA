import { randomUUID } from 'node:crypto';
import { ACCESS_TOKEN_PERMISSIONS, type PageBlockComment } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { addMcpBlockComment } from '../lib/mcp.comments.lib';
import { openMcpPage, readMcpPageId } from '../lib/mcp.page-access.lib';
import { describeMcpWrittenBlocks, formatMcpWrittenBlocksText, writeMcpContent } from '../lib/mcp.page-writes.lib';
import { commentedBlockOutputSchema, commentOnBlockInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpCommentedBlockOutput, McpCommentOnBlockInput } from '../types/mcp.pages.types';
import type { McpCall, McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

/**
 * El nombre con que firma quien comenta, el mismo que ven los demás en el
 * espacio. Quien tiene un token es miembro de su espacio de trabajo: si no
 * aparece, algo se rompió en otra parte, y eso no se disimula firmando con otro.
 */
const readAuthorName = async (dependencies: McpServerDependencies, call: McpCall): Promise<string> => {
  const members = await dependencies.people.listAssignableMembers(call.workspace.id);
  const author = members.find((member) => member.id === call.principal.userId);
  if (author === undefined) throw new Error('The owner of the token is not a member of its workspace');
  return author.name;
};

const commentOnBlock = async (
  dependencies: McpServerDependencies,
  input: McpCommentOnBlockInput,
  { call, record }: McpWriteSession,
): Promise<McpCommentedBlockOutput> => {
  const [opened, author] = await Promise.all([
    openMcpPage(dependencies, call, readMcpPageId(input.page), ACCESS_TOKEN_PERMISSIONS.pagesWrite),
    readAuthorName(dependencies, call),
  ]);
  const comment: PageBlockComment = {
    author,
    body: input.text,
    createdAt: new Date().toISOString(),
    id: randomUUID(),
  };
  const request = {
    blockIds: [input.block],
    detail: { comment: comment.id },
    pageId: opened.page.id,
    tool: MCP_TOOL_NAMES.commentOnBlock,
  };
  const content = await record(request, () =>
    writeMcpContent(dependencies, call, opened.page, addMcpBlockComment(input.block, comment, input.quote)),
  );
  const written = await describeMcpWrittenBlocks(dependencies, call, { ...opened, content }, [input.block]);
  return { ...written, comment: { ...comment, blockId: input.block } };
};

/**
 * Deja un comentario en un bloque, como lo deja una persona desde el menú del
 * bloque, firmado por la persona dueña del token. Si habla de unas palabras,
 * quedan marcadas con él.
 */
export const commentOnBlockTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.commentOnBlock,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.commentOnBlock,
      {
        description:
          'Leave a comment on one block of a page, signed as the person who owns this token, the way a person comments from the block menu: on the whole block, or on some of its words given in quote, which get marked. Comments are for remarks and questions about a block; they do not change what it says. Returns the block with its comment id.',
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
