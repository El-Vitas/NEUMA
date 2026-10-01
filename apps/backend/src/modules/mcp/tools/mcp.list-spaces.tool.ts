import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { MCP_TOOL_NAMES } from '../constants/mcp.constants';
import { canMcpPrincipalSeeSpace, listMcpPageRuleProbes, permitsListing } from '../lib/mcp.access.lib';
import { requireMcpPrincipal, resolveMcpWorkspace, runMcpTool } from '../lib/mcp.tool.lib';
import { listSpacesInputSchema, listSpacesOutputSchema } from '../schemas/mcp.schemas';
import type { McpToolDefinition } from '../types/mcp.types';

/**
 * Los espacios que el token ve: los que su dueño ve, recortados a los que la
 * regla del token deja leer o que tienen dentro una página abierta.
 */
export const listSpacesTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.listSpaces,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.listSpaces,
      {
        description: 'List the spaces you can access. Use it to learn what areas of knowledge exist and get their ids.',
        inputSchema: listSpacesInputSchema,
        outputSchema: listSpacesOutputSchema,
      },
      async () =>
        runMcpTool(dependencies, MCP_TOOL_NAMES.listSpaces, async () => {
          const principal = await requireMcpPrincipal(dependencies);
          const workspace = await resolveMcpWorkspace(dependencies, principal);
          const [spaces, reach] = await Promise.all([
            dependencies.spacesService.listAccessible(workspace.id, principal.userId, principal.role),
            dependencies.placeReader.resolvePageReach(listMcpPageRuleProbes(principal, permitsListing), workspace.id),
          ]);
          const visible = spaces.filter((space) => canMcpPrincipalSeeSpace(principal, space.id, reach));
          return listSpacesOutputSchema.parse({ spaces: visible });
        }),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesRead, ACCESS_TOKEN_PERMISSIONS.collectionsRead],
};
