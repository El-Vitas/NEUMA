import type { McpRefusalReason } from '../../types/mcp.types';

/**
 * Its message is written for the agent: what happened and how to proceed. Unexpected failures
 * are not detailed to the agent. The reason, when present, is what gets logged instead of the message.
 */
export class McpToolError extends Error {
  readonly reason?: McpRefusalReason;

  constructor(message: string, reason?: McpRefusalReason) {
    super(message);
    this.name = 'McpToolError';
    if (reason !== undefined) this.reason = reason;
  }
}
