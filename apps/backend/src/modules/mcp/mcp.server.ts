import { McpServer } from '@modelcontextprotocol/server';
import { MCP_SERVER_INFO } from './constants/mcp.constants';
import { MCP_TOOLS } from './constants/mcp.tools.constants';
import { listMcpToolsOffered } from './lib/mcp.access.lib';
import { writeMcpServerInstructions } from './lib/mcp.instructions.lib';
import type { McpPrincipal, McpServerDependencies } from './types/mcp.types';

/**
 * Un servidor MCP para una identidad.
 *
 * Por la terminal se arma uno por proceso y por HTTP uno por petición. Solo
 * lleva las herramientas que el token puede usar en algún espacio; que alcance
 * para el espacio de cada llamada lo revisa cada herramienta al correr, con la
 * identidad que vuelve a pedir en ese momento.
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
