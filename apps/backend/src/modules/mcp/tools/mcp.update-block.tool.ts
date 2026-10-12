import { ACCESS_TOKEN_PERMISSIONS, findPageBlock, isPageDocumentNode } from '@neuma/shared';
import { MCP_NOTHING_TO_CHANGE_MESSAGE, MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { buildMcpBlockNodes } from '../lib/mcp.block-input.lib';
import { buildMcpBlockUpdate } from '../lib/mcp.block-update.lib';
import { checkMcpDrawings } from '../lib/mcp.drawing-checks.lib';
import { openMcpPage, readMcpPageId, requireMcpInput } from '../lib/mcp.page-access.lib';
import {
  describeMcpWrittenBlocks,
  formatMcpWrittenBlocksText,
  prepareMcpBlocks,
  settleMcpWrittenNodes,
  writeMcpContent,
} from '../lib/mcp.page-writes.lib';
import { updateBlockInputSchema, writtenBlocksOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpBlockChange, McpUpdateBlockInput, McpWrittenBlocksOutput } from '../types/mcp.pages.types';
import type {
  McpCall,
  McpPageSource,
  McpServerDependencies,
  McpToolDefinition,
  McpWriteSession,
} from '../types/mcp.types';

const readChildren = (node: unknown): readonly unknown[] => (isPageDocumentNode(node) ? (node.content ?? []) : []);

/** A quote's text splits into paragraphs, as on insert. */
const prepareWords = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  text: string,
): Promise<NonNullable<McpBlockChange['words']>> => {
  const built = requireMcpInput(
    buildMcpBlockNodes([
      { text, type: 'paragraph' },
      { text, type: 'blockquote' },
    ]),
  );
  await checkMcpDrawings(dependencies, built);
  const [paragraph, quote] = await settleMcpWrittenNodes(dependencies, call, built);
  return { inline: readChildren(paragraph), paragraphs: readChildren(quote), text };
};

const checkChangedDrawing = async (
  dependencies: McpServerDependencies,
  page: McpPageSource,
  blockId: string,
  text: string,
): Promise<void> => {
  const nodes = isPageDocumentNode(page.content) ? (page.content.content ?? []) : [];
  const target = findPageBlock(nodes, blockId);
  if (target?.type !== 'code_block') return;
  await checkMcpDrawings(dependencies, [{ ...target, content: [{ text, type: 'text' }] }]);
};

const readColors = (input: McpUpdateBlockInput): McpBlockChange => {
  const colors = {
    ...(input.backgroundColor === undefined ? {} : { backgroundColor: input.backgroundColor }),
    ...(input.textColor === undefined ? {} : { textColor: input.textColor }),
  };
  return Object.keys(colors).length === 0 ? {} : { colors };
};

const prepareChange = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  input: McpUpdateBlockInput,
): Promise<McpBlockChange> => {
  const asksForWordsOrCheck = input.text !== undefined || input.checked !== undefined || input.summary !== undefined;
  const colors = readColors(input);
  if (input.replacement !== undefined && asksForWordsOrCheck)
    throw new McpToolError('Send either a replacement block, or new text, summary and checked, not both.');
  if (input.replacement !== undefined) {
    const prepared = await prepareMcpBlocks(dependencies, call, [input.replacement]);
    return { replacement: prepared.nodes[0], ...colors };
  }
  if (!asksForWordsOrCheck && colors.colors === undefined) throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
  return {
    ...(input.checked === undefined ? {} : { checked: input.checked }),
    ...(input.summary === undefined ? {} : { summary: input.summary }),
    ...(input.text === undefined ? {} : { words: await prepareWords(dependencies, call, input.text) }),
    ...colors,
  };
};

const updateBlock = async (
  dependencies: McpServerDependencies,
  input: McpUpdateBlockInput,
  { call, record }: McpWriteSession,
): Promise<McpWrittenBlocksOutput> => {
  const opened = await openMcpPage(dependencies, call, readMcpPageId(input.page), ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  const change = await prepareChange(dependencies, call, input);
  if (input.text !== undefined) await checkChangedDrawing(dependencies, opened.page, input.block, input.text);
  const request = {
    blockIds: [input.block],
    detail: { checked: input.checked ?? null, replaced: input.replacement !== undefined },
    pageId: opened.page.id,
    tool: MCP_TOOL_NAMES.updateBlock,
  };
  const content = await record(request, () =>
    writeMcpContent(dependencies, call, opened.page, buildMcpBlockUpdate(input.block, change)),
  );
  return describeMcpWrittenBlocks(dependencies, call, { ...opened, content }, [input.block]);
};

/** The block keeps its id so links to it still resolve. */
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
        runMcpWrite(
          dependencies,
          { target: input.page, tool: MCP_TOOL_NAMES.updateBlock },
          (session) => updateBlock(dependencies, input, session),
          formatMcpWrittenBlocksText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
