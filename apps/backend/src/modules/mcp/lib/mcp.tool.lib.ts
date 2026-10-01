import { type AccessTokenPermission, type AccessTokenPlace, canAccessTokenAct } from '@company-brain/shared';
import {
  MCP_CALL_OUTCOMES,
  MCP_INACCESSIBLE_MESSAGE,
  MCP_UNAUTHENTICATED_MESSAGE,
  MCP_UNEXPECTED_MESSAGE,
} from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type {
  McpCall,
  McpCallOutcome,
  McpPrincipal,
  McpRefusalReason,
  McpServerDependencies,
  McpWorkspace,
} from '../types/mcp.types';
import { buildMcpSearchScope, listMcpPageRuleProbes, permitsPageReading } from './mcp.access.lib';

/** Quién llama, o un fallo que el agente entiende. Se pregunta en cada llamada para que revocar corte al instante. */
export const requireMcpPrincipal = async (dependencies: McpServerDependencies): Promise<McpPrincipal> => {
  const principal = await dependencies.principalResolver.resolve();
  if (principal === null) throw new McpToolError(MCP_UNAUTHENTICATED_MESSAGE);
  return principal;
};

/**
 * Corta la llamada si la regla más cercana del token no da ese permiso en ese
 * lugar, o si su dueño ya no puede hacerlo.
 *
 * Se contesta igual que si el recurso no existiera: decir «no tienes permiso»
 * confirmaría que ahí hay algo, y eso ya es contar de más.
 */
export const requireMcpPermissionAt = (
  principal: McpPrincipal,
  place: AccessTokenPlace,
  permission: AccessTokenPermission,
): void => {
  if (!canAccessTokenAct(principal.access, principal.role, place, permission)) {
    throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  }
};

/**
 * Dónde está hoy una página del espacio de trabajo del token, con sus
 * ancestros. Si no está, se contesta como a una página que no se puede ver.
 */
export const readMcpPlace = async (
  dependencies: McpServerDependencies,
  pageId: string,
  workspaceId: string,
): Promise<AccessTokenPlace> => {
  const place = await dependencies.placeReader.readPlace(pageId, workspaceId);
  if (place === null) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  return place;
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
 * Lo que toda llamada que lee necesita: quién llama, su espacio de trabajo, y
 * lo que su token deja leer, resuelto con el árbol de páginas de hoy.
 *
 * El recorte sale de lo que el token tiene dado y nunca de lo que pide el
 * agente: lo que el agente pida se suma como otro filtro, que solo achica.
 */
export const openMcpCall = async (dependencies: McpServerDependencies): Promise<McpCall> => {
  const principal = await requireMcpPrincipal(dependencies);
  const workspace = await resolveMcpWorkspace(dependencies, principal);
  const reach = await dependencies.placeReader.resolvePageReach(
    listMcpPageRuleProbes(principal, permitsPageReading),
    workspace.id,
  );
  return {
    principal,
    viewer: {
      role: principal.role,
      tokenScope: buildMcpSearchScope(principal, reach),
      userId: principal.userId,
      workspaceId: workspace.id,
    },
    workspace,
  };
};

/**
 * Corre una herramienta y la contesta siempre en la forma que MCP espera.
 *
 * Lo que sale bien viaja dos veces: como texto, que es lo que lee el modelo, y
 * como estructura, que es lo que lee el programa que lo aloja. Lo que falla
 * nunca revienta la conversación: vuelve como un resultado marcado de error,
 * con un mensaje que el agente puede leer. Lo inesperado se cuenta entero, con
 * su traza, y su detalle se queda del lado del servidor. Toda llamada, termine
 * como termine, se cuenta con su herramienta, cómo terminó y cuánto tardó.
 */
export const runMcpTool = async <TOutput extends Record<string, unknown>>(
  dependencies: Pick<McpServerDependencies, 'observer'>,
  tool: string,
  action: () => Promise<TOutput>,
  formatText: (output: TOutput) => string = (output) => JSON.stringify(output),
) => {
  const startedAt = performance.now();
  const finish = (outcome: McpCallOutcome, refusal?: McpRefusalReason): void => {
    const durationMs = Math.round(performance.now() - startedAt);
    dependencies.observer.callFinished({ durationMs, outcome, ...(refusal === undefined ? {} : { refusal }), tool });
  };
  try {
    const output = await action();
    const answer = { content: [{ text: formatText(output), type: 'text' as const }], structuredContent: output };
    finish(MCP_CALL_OUTCOMES.done);
    return answer;
  } catch (error) {
    if (error instanceof McpToolError) {
      finish(MCP_CALL_OUTCOMES.refused, error.reason);
      return { content: [{ text: error.message, type: 'text' as const }], isError: true };
    }
    dependencies.observer.unexpected(error, tool);
    finish(MCP_CALL_OUTCOMES.failed);
    return { content: [{ text: MCP_UNEXPECTED_MESSAGE, type: 'text' as const }], isError: true };
  }
};
