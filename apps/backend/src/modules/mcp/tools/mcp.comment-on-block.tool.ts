import { randomUUID } from 'node:crypto';
import { ACCESS_TOKEN_PERMISSIONS, type PageBlockComment } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { addMcpBlockComment } from '../lib/mcp.comments.lib';
import { openMcpPage, readMcpPageId } from '../lib/mcp.page-access.lib';
import { describeMcpWrittenBlocks, formatMcpWrittenBlocksText, writeMcpContent } from '../lib/mcp.page-writes.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { commentedBlockOutputSchema, commentOnBlockInputSchema } from '../schemas/mcp.pages.schemas';
import type { McpCall, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

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
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.commentOnBlock,
          async () => {
            const call = await openMcpCall(dependencies);
            const { page } = await openMcpPage(
              dependencies,
              call,
              readMcpPageId(input.page),
              ACCESS_TOKEN_PERMISSIONS.pagesWrite,
            );
            const comment: PageBlockComment = {
              author: await readAuthorName(dependencies, call),
              body: input.text,
              createdAt: new Date().toISOString(),
              id: randomUUID(),
            };
            const request = {
              blockIds: [input.block],
              detail: { comment: comment.id },
              pageId: page.id,
              tool: MCP_TOOL_NAMES.commentOnBlock,
            };
            const content = await recordMcpWrite(dependencies, call, request, () =>
              writeMcpContent(dependencies, call, page, addMcpBlockComment(input.block, comment, input.quote)),
            );
            const written = await describeMcpWrittenBlocks(dependencies, call, page, content, [input.block]);
            return { ...written, comment: { ...comment, blockId: input.block } };
          },
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
