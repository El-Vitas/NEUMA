import { McpServer } from '@modelcontextprotocol/server';
import { MCP_SERVER_INFO } from './constants/mcp.constants';
import { MCP_TOOLS } from './constants/mcp.tools.constants';
import { listMcpToolsOffered } from './lib/mcp.access.lib';
import { writeMcpServerInstructions } from './lib/mcp.instructions.lib';
import type { McpPrincipal, McpServerDependencies } from './types/mcp.types';

/**
 * One MCP server per identity: per process over stdio, per request over HTTP.
 * Registers only the tools the token can use in some space; each tool rechecks
 * access for the call's space with a freshly resolved identity.
 */
export const createMcpServer = (
  dependencies: McpServerDependencies,
  principalAtStart: McpPrincipal | null,
): McpServer => {
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions: writeMcpServerInstructions(dependencies.portalUrl),
  });
  for (const tool of listMcpToolsOffered(MCP_TOOLS, principalAtStart)) tool.register(server, dependencies);
  return server;
};
