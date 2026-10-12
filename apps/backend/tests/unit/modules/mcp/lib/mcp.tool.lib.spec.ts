import { describe, expect, it } from 'bun:test';
import { MCP_REFUSAL_REASONS } from '@/modules/mcp/constants/mcp.constants';
import { McpToolError } from '@/modules/mcp/infrastructure/errors/mcp.tool.error';
import { runMcpTool } from '@/modules/mcp/lib/mcp.tool.lib';
import type { McpFinishedCall, McpServerDependencies } from '@/modules/mcp/types/mcp.types';

const watchCalls = () => {
  const finished: Omit<McpFinishedCall, 'durationMs'>[] = [];
  const dependencies: Pick<McpServerDependencies, 'observer'> = {
    observer: {
      callFinished: ({ durationMs: _durationMs, ...call }: McpFinishedCall) => {
        finished.push(call);
      },
      unexpected: () => undefined,
    },
  };
  return { dependencies, finished };
};

describe('runMcpTool', () => {
  it('tells why a call was refused, and never the message the agent reads', async () => {
    const { dependencies, finished } = watchCalls();

    const answer = await runMcpTool(dependencies, 'insert_blocks', () =>
      Promise.reject(new McpToolError('Block 1: "secreto" cannot be drawn', MCP_REFUSAL_REASONS.diagram)),
    );

    expect(answer).toEqual({
      content: [{ text: 'Block 1: "secreto" cannot be drawn', type: 'text' }],
      isError: true,
    });
    expect(finished).toEqual([{ outcome: 'REFUSED', refusal: 'diagram', tool: 'insert_blocks' }]);
  });

  it('leaves the reason out when the refusal gives none', async () => {
    const { dependencies, finished } = watchCalls();

    await runMcpTool(dependencies, 'fetch', () => Promise.reject(new McpToolError('No such page')));

    expect(finished).toEqual([{ outcome: 'REFUSED', tool: 'fetch' }]);
  });
});
