import { describe, expect, it } from 'bun:test';
import { createMcpObserver } from '@/modules/mcp/lib/mcp.observer.lib';
import type { McpLogger } from '@/modules/mcp/types/mcp.types';

const createLogger = () => {
  const written: { fields: object; level: string; message: string }[] = [];
  const logger: McpLogger = {
    error: (fields, message) => written.push({ fields, level: 'ERROR', message }),
    info: (fields, message) => written.push({ fields, level: 'INFO', message }),
  };
  return { logger, written };
};

describe('createMcpObserver', () => {
  it('writes every finished call with its tool, how it ended and how long it took', () => {
    const { logger, written } = createLogger();

    createMcpObserver(logger).callFinished({ durationMs: 42, outcome: 'REFUSED', tool: 'update_row' });

    expect(written).toEqual([
      {
        fields: { mcpCall: { durationMs: 42, outcome: 'REFUSED', tool: 'update_row' } },
        level: 'INFO',
        message: 'MCP tool call finished',
      },
    ]);
  });

  it('writes an unexpected failure as an error carrying the error itself, so its trace is kept', () => {
    const { logger, written } = createLogger();
    const failure = new Error('The live document went away');

    createMcpObserver(logger).unexpected(failure, 'insert_blocks');

    expect(written).toEqual([
      { fields: { err: failure, where: 'insert_blocks' }, level: 'ERROR', message: 'MCP failed unexpectedly' },
    ]);
  });
});
