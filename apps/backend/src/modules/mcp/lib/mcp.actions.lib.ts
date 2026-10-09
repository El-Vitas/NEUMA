import { AgentActionOutcome } from '@company-brain/db';
import {
  MCP_ABANDONED_REQUEST_MS,
  MCP_REQUEST_ALREADY_DONE_MESSAGE,
  MCP_REQUEST_ID_TAKEN_MESSAGE,
  MCP_REQUEST_IN_PROGRESS_MESSAGE,
  MCP_REQUEST_UNKNOWN_MESSAGE,
} from '../constants/mcp.constants';
import { MCP_ACTION_TARGET_MAX_LENGTH } from '../constants/mcp.limits.constants';
import { McpRequestTakenError } from '../infrastructure/errors/mcp.request-taken.error';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type {
  McpActionClosing,
  McpActionDependencies,
  McpActionEntry,
  McpActionRequest,
  McpAttempt,
  McpCall,
  McpLiveRequest,
  McpServerDependencies,
  McpWriteSession,
} from '../types/mcp.types';
import { openMcpCall, runMcpTool } from './mcp.tool.lib';

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
  createdPageId?: string,
): Promise<void> => {
  try {
    await dependencies.actionLog.finish(actionId, outcome, createdPageId);
  } catch (error) {
    dependencies.observer.unexpected(error, `closing agent action ${actionId} as ${outcome}`);
  }
};

const readWho = (call: McpCall) => ({
  tokenId: call.principal.tokenId,
  userId: call.principal.userId,
  workspaceId: call.workspace.id,
});

/**
 * Abre la acción antes de escribir. Si otro reintento con el mismo id se anotó
 * un instante antes, este no escribe: se le dice al agente que espere.
 */
const startAction = async (dependencies: McpActionDependencies, entry: McpActionEntry): Promise<string> => {
  try {
    return await dependencies.actionLog.start(entry);
  } catch (error) {
    if (error instanceof McpRequestTakenError) throw new McpToolError(MCP_REQUEST_IN_PROGRESS_MESSAGE);
    throw error;
  }
};

const describeDoneRequest = (done: McpLiveRequest): string =>
  done.pageId === null
    ? MCP_REQUEST_ALREADY_DONE_MESSAGE
    : `${MCP_REQUEST_ALREADY_DONE_MESSAGE} It was done on page ${done.pageId}: read it with fetch.`;

/**
 * Un pedido con un id que el agente ya mandó no se hace dos veces: si se hizo,
 * se dice dónde quedó; si sigue en curso, que espere. Uno que lleva demasiado
 * pendiente pudo hacerse sin que se anotara, así que su id tampoco se libera:
 * se le dice al agente cómo saberlo y que, si no está, use un id nuevo.
 */
const requireFreshRequest = async (
  dependencies: McpActionDependencies,
  call: McpCall,
  attempt: McpAttempt & { readonly requestId: string },
): Promise<void> => {
  const live = await dependencies.actionLog.findLiveRequest(call.principal.tokenId, attempt.requestId);
  if (live === null) return;
  if (live.tool !== attempt.tool)
    throw new McpToolError(`${MCP_REQUEST_ID_TAKEN_MESSAGE} It was used for ${live.tool}.`);
  if (live.isDone) throw new McpToolError(describeDoneRequest(live));
  const isAbandoned = Date.now() - live.startedAt.getTime() >= MCP_ABANDONED_REQUEST_MS;
  throw new McpToolError(isAbandoned ? MCP_REQUEST_UNKNOWN_MESSAGE : MCP_REQUEST_IN_PROGRESS_MESSAGE);
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
  request: McpActionRequest & { readonly requestId?: string | null },
  write: () => Promise<TResult>,
  createdPageIdOf?: (result: TResult) => string,
): Promise<TResult> => {
  const actionId = await startAction(dependencies, {
    ...request,
    requestId: request.requestId ?? null,
    ...readWho(call),
  });
  let result: TResult;
  try {
    result = await write();
  } catch (error) {
    await closeAction(dependencies, actionId, outcomeOf(error));
    throw error;
  }
  await closeAction(dependencies, actionId, AgentActionOutcome.DONE, createdPageIdOf?.(result));
  return result;
};

/**
 * Anota un intento que se negó o falló antes de llegar a escribir: un token
 * sin permiso, una página bloqueada, un diagrama que no se dibuja. Si el
 * registro falla, se cuenta, y el agente igual recibe el motivo verdadero.
 */
const recordRefusedAttempt = async (
  dependencies: McpActionDependencies,
  call: McpCall,
  attempt: McpAttempt,
  error: unknown,
): Promise<void> => {
  const target = attempt.target?.slice(0, MCP_ACTION_TARGET_MAX_LENGTH) ?? null;
  try {
    const actionId = await dependencies.actionLog.start({
      blockIds: [],
      detail: { target },
      pageId: null,
      requestId: null,
      tool: attempt.tool,
      ...readWho(call),
    });
    await dependencies.actionLog.finish(actionId, outcomeOf(error));
  } catch (logError) {
    dependencies.observer.unexpected(logError, `writing down a refused ${attempt.tool}`);
  }
};

/**
 * Corre lo que hace una herramienta que escribe dejando anotado cada intento:
 * la escritura que llegó a hacerse se anota al hacerla, y la que se negó
 * antes (por permiso, por lo que pidió, por el estado de la página) se anota
 * igual, como negada, apuntando a lo que el agente nombró.
 */
export const recordMcpAttempt = async <TOutput>(
  dependencies: McpActionDependencies,
  call: McpCall,
  attempt: McpAttempt,
  act: (record: McpWriteSession['record']) => Promise<TOutput>,
): Promise<TOutput> => {
  const progress = { isRecorded: false };
  const record: McpWriteSession['record'] = (request, write, createdPageIdOf) => {
    progress.isRecorded = true;
    return recordMcpWrite(
      dependencies,
      call,
      { ...request, requestId: attempt.requestId ?? null },
      write,
      createdPageIdOf,
    );
  };
  try {
    const { requestId } = attempt;
    if (requestId !== undefined) await requireFreshRequest(dependencies, call, { ...attempt, requestId });
    return await act(record);
  } catch (error) {
    if (!progress.isRecorded) await recordRefusedAttempt(dependencies, call, attempt, error);
    throw error;
  }
};

/**
 * Una herramienta que escribe: abre la llamada, anota cada intento y contesta
 * en la forma que MCP espera. Un token que ni siquiera se reconoce no llega a
 * anotar nada, porque no hay a nombre de quién.
 */
export const runMcpWrite = <TOutput extends Record<string, unknown>>(
  dependencies: McpServerDependencies,
  attempt: McpAttempt,
  act: (session: McpWriteSession) => Promise<TOutput>,
  formatText?: (output: TOutput) => string,
): ReturnType<typeof runMcpTool<TOutput>> =>
  runMcpTool(
    dependencies,
    attempt.tool,
    async () => {
      const call = await openMcpCall(dependencies);
      return recordMcpAttempt(dependencies, call, attempt, (record) => act({ call, record }));
    },
    formatText,
  );
