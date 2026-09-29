import { AgentActionOutcome } from '@company-brain/db';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpActionRequest, McpCall, McpServerDependencies } from '../types/mcp.types';

const outcomeOf = (error: unknown): AgentActionOutcome =>
  error instanceof McpToolError ? AgentActionOutcome.REFUSED : AgentActionOutcome.FAILED;

/**
 * Hace una escritura del agente y la deja anotada, termine como termine.
 *
 * Se anota lo que se hizo y también lo que se negó o falló: saber qué intentó
 * un agente y no pudo es tan importante como saber qué cambió. El error sigue
 * su camino hacia el agente después de anotarlo.
 *
 * Solo el intento de escribir decide si fue rechazado o falló. Anotar va
 * aparte: si el registro falla después de una escritura hecha, esa escritura
 * no pasa a figurar como fallida.
 */
export const recordMcpWrite = async <TResult>(
  dependencies: Pick<McpServerDependencies, 'actionLog'>,
  call: McpCall,
  request: McpActionRequest,
  write: () => Promise<TResult>,
): Promise<TResult> => {
  const who = { tokenId: call.principal.tokenId, userId: call.principal.userId, workspaceId: call.workspace.id };
  const result = await write().catch(async (error: unknown) => {
    await dependencies.actionLog.record({ ...request, ...who, outcome: outcomeOf(error) });
    throw error;
  });
  await dependencies.actionLog.record({ ...request, ...who, outcome: AgentActionOutcome.DONE });
  return result;
};
