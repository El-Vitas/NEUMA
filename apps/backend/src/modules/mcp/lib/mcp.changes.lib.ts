import type { Result } from '@neuma/shared';
import { MCP_CHANGES_POLL_INTERVAL_MS, MCP_MILLISECONDS_PER_SECOND } from '../constants/mcp.limits.constants';
import type {
  McpChangesAnswer,
  McpCollectionChangesOutput,
  McpColumn,
  McpOpenCollection,
  McpRefusal,
} from '../types/mcp.collections.types';
import type { McpAssignablePerson } from '../types/mcp.types';
import { describeMcpRow } from './mcp.collections.lib';

const sleep = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

const isQuiet = (answer: McpChangesAnswer): boolean =>
  answer.rows.length === 0 && answer.possiblyChanged.length === 0 && answer.trashedIds.length === 0 && !answer.isReset;

/**
 * Reads what changed, and when nothing did and the agent asked to wait, reads again each second from the cursor of
 * the last read until something changes or the time is up. A read with no cursor only starts the watch, so it never
 * waits.
 */
export const readMcpChangesWaiting = async (
  read: (cursor: string | undefined) => Promise<Result<McpChangesAnswer, McpRefusal>>,
  options: { readonly since: string | undefined; readonly waitSeconds: number },
): Promise<Result<McpChangesAnswer, McpRefusal>> => {
  const deadline = Date.now() + options.waitSeconds * MCP_MILLISECONDS_PER_SECOND;
  let answer = await read(options.since);
  while (options.since !== undefined && answer.isOk() && isQuiet(answer.getValue()) && Date.now() < deadline) {
    await sleep(Math.min(MCP_CHANGES_POLL_INTERVAL_MS, Math.max(0, deadline - Date.now())));
    answer = await read(answer.getValue().cursor);
  }
  return answer;
};

/** The changes as the agent reads them: names instead of ids, only the columns it asked for. */
export const describeMcpChanges = (
  portalUrl: string,
  collection: McpOpenCollection,
  people: readonly McpAssignablePerson[],
  answer: McpChangesAnswer,
  columns: readonly McpColumn[],
): McpCollectionChangesOutput => {
  const lookups = {
    files: new Map(answer.attachedFiles.map((file) => [file.id, file.name])),
    rows: new Map<string, string>(),
  };
  const shape = { properties: columns, views: collection.shape.views };
  return {
    cursor: answer.cursor,
    hasMore: answer.hasMore,
    possiblyChanged: answer.possiblyChanged.map((row) => describeMcpRow(portalUrl, shape, row, people, lookups)),
    possiblyChangedTruncated: answer.possiblyChangedIsTruncated,
    reset: answer.isReset,
    rows: answer.rows.map((row) => describeMcpRow(portalUrl, shape, row, people, lookups)),
    total: answer.total,
    trashed: [...answer.trashedIds],
  };
};
