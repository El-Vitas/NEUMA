import { ACCESS_TOKEN_PERMISSIONS, isPageDocumentNode } from '@company-brain/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { recordMcpWrite } from '../lib/mcp.actions.lib';
import { buildMcpBlockNodes } from '../lib/mcp.block-input.lib';
import { buildMcpBlockUpdate } from '../lib/mcp.block-update.lib';
import { findMcpBlockNode } from '../lib/mcp.blocks.lib';
import { checkMcpDrawings } from '../lib/mcp.drawing-checks.lib';
import { openMcpPage, readMcpPageId, requireMcpInput } from '../lib/mcp.page-access.lib';
import {
  describeMcpWrittenBlocks,
  formatMcpWrittenBlocksText,
  prepareMcpBlocks,
  settleMcpWrittenNodes,
  writeMcpContent,
} from '../lib/mcp.page-writes.lib';
import { openMcpCall, runMcpTool } from '../lib/mcp.tool.lib';
import { updateBlockInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpBlockChange, McpUpdateBlockInput } from '../types/mcp.pages.types';
import type { McpCall, McpPageSource, McpServerDependencies, McpToolDefinition } from '../types/mcp.types';

/** Las palabras nuevas de un bloque, leídas como las de un párrafo, con sus menciones revisadas. */
const prepareWords = async (dependencies: McpServerDependencies, call: McpCall, text: string) => {
  const built = requireMcpInput(buildMcpBlockNodes([{ text, type: 'paragraph' }]));
  await checkMcpDrawings(dependencies, built);
  const [paragraph] = await settleMcpWrittenNodes(dependencies, call, built);
  return { inline: isPageDocumentNode(paragraph) ? (paragraph.content ?? []) : [], text };
};

/**
 * Las palabras nuevas de un bloque que la página dibuja —un diagrama, una
 * fórmula— se revisan como se revisaría el bloque entero, antes de escribir.
 */
const checkChangedDrawing = async (
  dependencies: McpServerDependencies,
  page: McpPageSource,
  blockId: string,
  text: string,
): Promise<void> => {
  const nodes = isPageDocumentNode(page.content) ? (page.content.content ?? []) : [];
  const target = findMcpBlockNode(nodes, blockId);
  if (target?.type !== 'code_block') return;
  await checkMcpDrawings(dependencies, [{ ...target, content: [{ text, type: 'text' }] }]);
};

/** Los colores que se pidió darle o quitarle al bloque entero, si se pidió alguno. */
const readColors = (input: McpUpdateBlockInput): McpBlockChange => {
  const colors = {
    ...(input.backgroundColor === undefined ? {} : { backgroundColor: input.backgroundColor }),
    ...(input.textColor === undefined ? {} : { textColor: input.textColor }),
  };
  return Object.keys(colors).length === 0 ? {} : { colors };
};

/** Lo que el agente pidió cambiar: o un bloque entero, o sus palabras y si está marcado; y, con cualquiera, sus colores. */
const prepareChange = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  input: McpUpdateBlockInput,
): Promise<McpBlockChange> => {
  const asksForWordsOrCheck = input.text !== undefined || input.checked !== undefined;
  const colors = readColors(input);
  if (input.replacement !== undefined && asksForWordsOrCheck)
    throw new McpToolError('Send either a replacement block, or new text and checked, not both.');
  if (input.replacement !== undefined) {
    const prepared = await prepareMcpBlocks(dependencies, call, [input.replacement]);
    return { replacement: prepared.nodes[0], ...colors };
  }
  if (!asksForWordsOrCheck && colors.colors === undefined) throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
  return {
    ...(input.checked === undefined ? {} : { checked: input.checked }),
    ...(input.text === undefined ? {} : { words: await prepareWords(dependencies, call, input.text) }),
    ...colors,
  };
};

/**
 * Cambia un bloque de una página: sus palabras, si un ítem de una lista de
 * tareas está hecho, o el bloque entero. El bloque conserva su id, así los
 * enlaces que lo señalaban siguen llegando a él.
 */
export const updateBlockTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.updateBlock,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.updateBlock,
      {
        description:
          'Change one block of a page, named by its id: new text keeping its kind, checked: true or false to tick or untick a checklist item, or a whole replacement block; with any of them, or alone, textColor and backgroundColor paint the whole block. The block keeps its id, so links to it keep working. Whoever has the page open sees it at once.',
        inputSchema: updateBlockInputSchema,
        outputSchema: writtenBlocksOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.updateBlock,
          async () => {
            const call = await openMcpCall(dependencies);
            const { page } = await openMcpPage(
              dependencies,
              call,
              readMcpPageId(input.page),
              ACCESS_TOKEN_PERMISSIONS.pagesWrite,
            );
            const change = await prepareChange(dependencies, call, input);
            if (input.text !== undefined) await checkChangedDrawing(dependencies, page, input.block, input.text);
            const request = {
              blockIds: [input.block],
              detail: { checked: input.checked ?? null, replaced: input.replacement !== undefined },
              pageId: page.id,
              tool: MCP_TOOL_NAMES.updateBlock,
            };
            const content = await recordMcpWrite(dependencies, call, request, () =>
              writeMcpContent(dependencies, call, page, buildMcpBlockUpdate(input.block, change)),
            );
            return describeMcpWrittenBlocks(dependencies, call, page, content, [input.block]);
          },
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
