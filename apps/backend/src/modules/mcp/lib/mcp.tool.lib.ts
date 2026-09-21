import { type AccessTokenPermission, canAccessTokenAct } from '@company-brain/shared';
import {
  MCP_INACCESSIBLE_MESSAGE,
  MCP_UNAUTHENTICATED_MESSAGE,
  MCP_UNEXPECTED_MESSAGE,
} from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpPrincipal, McpServerDependencies, McpWorkspace } from '../types/mcp.types';

/** Quién llama, o un fallo que el agente entiende. Se pregunta en cada llamada para que revocar corte al instante. */
export const requireMcpPrincipal = async (dependencies: McpServerDependencies): Promise<McpPrincipal> => {
  const principal = await dependencies.principalResolver.resolve();
  if (principal === null) throw new McpToolError(MCP_UNAUTHENTICATED_MESSAGE);
  return principal;
};

/**
 * Corta la llamada si el token no tiene ese permiso en ese espacio, o si su
 * dueño ya no puede hacerlo.
 *
 * Se contesta igual que si el recurso no existiera: decir «no tienes permiso»
 * confirmaría que ahí hay algo, y eso ya es contar de más.
 */
export const requireMcpPermissionIn = (
  principal: McpPrincipal,
  spaceId: string,
  permission: AccessTokenPermission,
): void => {
  if (!canAccessTokenAct(principal.access, principal.role, spaceId, permission)) {
    throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  }
};

/**
 * El espacio de trabajo del dueño, que tiene que ser el mismo del token.
 *
 * Un token nace en un espacio de trabajo y solo sirve ahí: si su dueño ya
 * pertenece a otro, el token no se lleva nada de un lado al otro.
 */
export const resolveMcpWorkspace = async (
  dependencies: McpServerDependencies,
  principal: McpPrincipal,
): Promise<McpWorkspace> => {
  const workspace = await dependencies.workspacesService.resolveForUser(principal.userId, principal.role);
  if (workspace.id !== principal.workspaceId) throw new McpToolError(MCP_UNAUTHENTICATED_MESSAGE);
  return workspace;
};

/**
 * Corre una herramienta y la contesta siempre en la forma que MCP espera.
 *
 * Lo que sale bien viaja dos veces: como texto, que es lo que lee el modelo, y
 * como estructura, que es lo que lee el programa que lo aloja. Lo que falla
 * nunca revienta la conversación: vuelve como un resultado marcado de error,
 * con un mensaje que el agente puede leer. Solo lo inesperado se reporta, y su
 * detalle se queda del lado del servidor.
 */
export const runMcpTool = async <TOutput extends Record<string, unknown>>(
  dependencies: McpServerDependencies,
  action: () => Promise<TOutput>,
  formatText: (output: TOutput) => string = (output) => JSON.stringify(output),
) => {
  try {
    const output = await action();
    return { content: [{ text: formatText(output), type: 'text' as const }], structuredContent: output };
  } catch (error) {
    if (!(error instanceof McpToolError)) dependencies.errorReporter?.report(error);
    const message = error instanceof McpToolError ? error.message : MCP_UNEXPECTED_MESSAGE;
    return { content: [{ text: message, type: 'text' as const }], isError: true };
  }
};
