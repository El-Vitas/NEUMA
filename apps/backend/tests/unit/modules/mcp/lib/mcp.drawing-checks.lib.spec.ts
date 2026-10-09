import { describe, expect, it } from 'bun:test';
import { Result } from '@company-brain/shared';
import { MCP_DIAGRAMS_PER_WRITE } from '@/modules/mcp/constants/mcp.limits.constants';
import { McpDiagramCheckerBusyError } from '@/modules/mcp/infrastructure/errors/mcp.diagram-busy.error';
import { McpDiagramCheckTimeoutError } from '@/modules/mcp/infrastructure/errors/mcp.diagram-timeout.error';
import { McpToolError } from '@/modules/mcp/infrastructure/errors/mcp.tool.error';
import { checkMcpDrawings } from '@/modules/mcp/lib/mcp.drawing-checks.lib';
import type { McpDrawingValidator } from '@/modules/mcp/types/mcp.pages.types';
import type { McpDrawingDependencies } from '@/modules/mcp/types/mcp.types';

const dependenciesWith = (drawings: McpDrawingValidator): McpDrawingDependencies => ({ drawings });

const drawingsThatAccept: McpDrawingValidator = {
  checkDiagram: () => Promise.resolve(Result.ok('architecture')),
  checkFormula: (latex) => Result.ok(latex),
};

const diagram = (source: string) => ({
  attrs: { language: 'mermaid' },
  content: [{ text: source, type: 'text' }],
  type: 'code_block',
});

const refusalOrNothing = async (check: Promise<void>): Promise<unknown> => {
  try {
    await check;
    return null;
  } catch (error) {
    return error;
  }
};

const refusalOf = async (check: Promise<void>): Promise<McpToolError> => {
  const error = await refusalOrNothing(check);
  if (!(error instanceof McpToolError)) throw new Error('Expected the drawings to be refused');
  return error;
};

describe('checkMcpDrawings', () => {
  it('lets through blocks whose drawings can all be drawn', async () => {
    const check = checkMcpDrawings(dependenciesWith(drawingsThatAccept), [
      diagram('architecture-beta\n  service db(logos:postgresql)[Base]'),
    ]);

    expect(await refusalOrNothing(check)).toBeNull();
  });

  it('refuses a diagram Mermaid cannot read, naming its block and passing on what Mermaid said', async () => {
    const drawings = {
      ...drawingsThatAccept,
      checkDiagram: () => Promise.resolve(Result.fail('Parse error on line 2')),
    };

    const refusal = await refusalOf(
      checkMcpDrawings(dependenciesWith(drawings), [{ type: 'divider' }, diagram('flowchart LR\n  A -->')]),
    );

    expect(refusal.message).toStartWith('Block 2: the diagram cannot be drawn. Mermaid says: Parse error on line 2');
    expect(refusal.reason).toBe('diagram');
  });

  it('refuses a diagram naming an icon the portal does not draw, even when Mermaid reads it', async () => {
    const refusal = await refusalOf(
      checkMcpDrawings(dependenciesWith(drawingsThatAccept), [
        diagram('architecture-beta\n  service db(logos:unicornio)[Base]'),
      ]),
    );

    expect(refusal.message).toContain('logos:unicornio');
    expect(refusal.reason).toBe('diagram icon');
  });

  it('refuses an architecture icon without a pack that Mermaid does not draw, saying which ones it does', async () => {
    const refusal = await refusalOf(
      checkMcpDrawings(dependenciesWith(drawingsThatAccept), [
        diagram('architecture-beta\n  group client(laptop)[Cliente]\n  service db(database)[Base] in client'),
      ]),
    );

    expect(refusal.message).toContain('the icon laptop');
    expect(refusal.message).toContain('cloud, database, disk, internet, server');
  });

  it('refuses an architecture diagram whose services are indented into a group they are not in', async () => {
    const refusal = await refusalOf(
      checkMcpDrawings(dependenciesWith(drawingsThatAccept), [
        diagram('architecture-beta\n  group data(database)[Datos]\n    service db(database)[Base]'),
      ]),
    );

    expect(refusal.message).toStartWith('Block 1: the service db is indented under the group data');
    expect(refusal.reason).toBe('diagram group');
  });

  it('refuses a formula KaTeX cannot set', async () => {
    const drawings = { ...drawingsThatAccept, checkFormula: () => Result.fail('KaTeX parse error: Expected }') };

    const refusal = await refusalOf(
      checkMcpDrawings(dependenciesWith(drawings), [
        { attrs: { language: 'latex' }, content: [{ text: '\\frac{a}{', type: 'text' }], type: 'code_block' },
      ]),
    );

    expect(refusal.message).toBe('Block 1: the formula cannot be set. KaTeX says: KaTeX parse error: Expected }');
    expect(refusal.reason).toBe('formula');
  });

  it('refuses a diagram that took too long to check, telling the agent to simplify it', async () => {
    const drawings = {
      ...drawingsThatAccept,
      checkDiagram: () => Promise.reject(new McpDiagramCheckTimeoutError(10_000)),
    };

    const refusal = await refusalOf(checkMcpDrawings(dependenciesWith(drawings), [diagram('flowchart LR\n A-->B')]));

    expect(refusal.message).toContain('Block 1');
    expect(refusal.message).toContain('Simplify it');
    expect(refusal.reason).toBe('diagram');
  });

  it('asks to send it again in a moment when the checker is full, without blaming the diagram', async () => {
    const drawings = {
      ...drawingsThatAccept,
      checkDiagram: () => Promise.reject(new McpDiagramCheckerBusyError(16)),
    };

    const refusal = await refusalOf(checkMcpDrawings(dependenciesWith(drawings), [diagram('flowchart LR\n A-->B')]));

    expect(refusal.message).toContain('Send it again in a moment');
    expect(refusal.message).not.toContain('Simplify');
  });

  it('stops checking at the first diagram that cannot be drawn', async () => {
    let checked = 0;
    const drawings = {
      ...drawingsThatAccept,
      checkDiagram: () => {
        checked += 1;
        return Promise.resolve(Result.fail('Parse error on line 2'));
      },
    };
    const three = [diagram('flowchart LR'), diagram('flowchart LR'), diagram('flowchart LR')];

    await refusalOf(checkMcpDrawings(dependenciesWith(drawings), three));

    expect(checked).toBe(1);
  });

  it('lets any other failure of the checker through as it is, because it is not the agent’s', async () => {
    const drawings = { ...drawingsThatAccept, checkDiagram: () => Promise.reject(new Error('The checker stopped')) };

    const error = await refusalOrNothing(checkMcpDrawings(dependenciesWith(drawings), [diagram('flowchart LR')]));

    expect(error).not.toBeInstanceOf(McpToolError);
  });

  it('refuses more diagrams in one write than it checks, before checking any', async () => {
    let checked = 0;
    const drawings = {
      ...drawingsThatAccept,
      checkDiagram: () => {
        checked += 1;
        return Promise.resolve(Result.ok('flowchart-v2'));
      },
    };
    const many = Array.from({ length: MCP_DIAGRAMS_PER_WRITE + 1 }, () => diagram('flowchart LR\n A-->B'));

    const refusal = await refusalOf(checkMcpDrawings(dependenciesWith(drawings), many));

    expect(refusal.message).toContain(String(MCP_DIAGRAMS_PER_WRITE));
    expect(checked).toBe(0);
  });
});
