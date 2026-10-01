import { AgentActionOutcome } from '@company-brain/db';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpActionClosing, McpActionDependencies, McpActionRequest, McpCall } from '../types/mcp.types';

const outcomeOf = (error: unknown): McpActionClosing =>
  error instanceof McpToolError ? AgentActionOutcome.REFUSED : AgentActionOutcome.FAILED;

/**
 * Cierra una acción con su resultado. Si el registro no responde, la acción
 * queda pendiente a la vista y el fallo se cuenta entero: lo que ya se
 * escribió no se deshace, y decirle al agente que falló lo haría repetirlo.
 */
const closeAction = async (
  dependencies: McpActionDependencies,
  actionId: string,
  outcome: McpActionClosing,
): Promise<void> => {
  try {
    await dependencies.actionLog.finish(actionId, outcome);
  } catch (error) {
    dependencies.observer.unexpected(error, `closing agent action ${actionId} as ${outcome}`);
  }
};

/**
 * Hace una escritura del agente dejándola anotada, termine como termine.
 *
 * La acción se anota antes de escribir: si no se puede anotar, no se escribe.
 * Después se cierra con lo que pasó, también si se negó o falló, porque saber
 * qué intentó un agente y no pudo es tan importante como saber qué cambió. El
 * error sigue su camino hacia el agente después de anotarlo.
 */
export const recordMcpWrite = async <TResult>(
  dependencies: McpActionDependencies,
  call: McpCall,
  request: McpActionRequest,
  write: () => Promise<TResult>,
): Promise<TResult> => {
  const who = { tokenId: call.principal.tokenId, userId: call.principal.userId, workspaceId: call.workspace.id };
  const actionId = await dependencies.actionLog.start({ ...request, ...who });
  const result = await write().catch(async (error: unknown) => {
    await closeAction(dependencies, actionId, outcomeOf(error));
    throw error;
  });
  await closeAction(dependencies, actionId, AgentActionOutcome.DONE);
  return result;
};
