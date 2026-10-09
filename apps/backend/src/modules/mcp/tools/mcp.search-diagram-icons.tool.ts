import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { MCP_DIAGRAM_ICON_PACKS, MCP_DIAGRAM_ICON_USAGE } from '../constants/mcp.diagram-icons.constants';
import { searchMcpDiagramIcons } from '../lib/mcp.diagram-icons.lib';
import { requireMcpPrincipal, runMcpTool } from '../lib/mcp.tool.lib';
import { searchDiagramIconsInputSchema, searchDiagramIconsOutputSchema } from '../schemas/mcp.pages.schemas';
import type { McpSearchDiagramIconsOutput } from '../types/mcp.pages.types';
import type { McpToolDefinition } from '../types/mcp.types';

const formatIconsText = (output: McpSearchDiagramIconsOutput): string =>
  output.icons.length === 0
    ? 'No icon answers to that. Try another word in English, such as the product name or what the icon shows.'
    : `${output.icons.join('\n')}\n\n${output.usage}`;

export const searchDiagramIconsTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.searchDiagramIcons,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.searchDiagramIcons,
      {
        description:
          'Find the icons a diagram can draw with, by what they show: product and brand logos (logos:aws, logos:postgresql…) and Material Design icons (mdi:database, mdi:server…). Returns names ready to use in a diagram block, and how to write them.',
        inputSchema: searchDiagramIconsInputSchema,
        outputSchema: searchDiagramIconsOutputSchema,
      },
      async (input) =>
        runMcpTool(
          dependencies,
          MCP_TOOL_NAMES.searchDiagramIcons,
          async () => {
            await requireMcpPrincipal(dependencies);
            return {
              icons: searchMcpDiagramIcons(MCP_DIAGRAM_ICON_PACKS, input.query, input.limit),
              usage: MCP_DIAGRAM_ICON_USAGE,
            };
          },
          formatIconsText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
