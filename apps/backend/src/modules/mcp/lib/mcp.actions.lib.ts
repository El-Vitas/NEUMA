import { AgentActionOutcome } from '@neuma/db';
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

/** The write already happened: a log failure is logged, not reported, or the agent would repeat the write. */
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

/** If a concurrent retry with the same id was recorded first, this one does not write and the agent is told to wait. */
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

/** A request id never runs twice. A stale pending one may have run unrecorded: the agent checks, then uses a new id. */
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
 * The action is recorded before writing: if it cannot be recorded, nothing is written. It is closed
 * with the outcome even when denied or failed, since what an agent tried and could not do matters
 * as much as what changed. The error still reaches the agent after being recorded.
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

/** If the log fails the failure is logged and the agent still receives the real reason. */
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

/** A write denied beforehand (permission, request, page state) is recorded as denied, with the named target. */
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

/** An unrecognized token records nothing: there is no one to attribute it to. */
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
