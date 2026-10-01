import { afterAll, describe, expect, it } from 'bun:test';
import { McpDrawingValidatorAdapter } from '@/modules/mcp/infrastructure/adapters/mcp.drawing.validator';

const STARTING_MERMAID_MS = 60_000;

describe('McpDrawingValidatorAdapter', () => {
  const validator = new McpDrawingValidatorAdapter();

  afterAll(() => {
    validator.onModuleDestroy();
  });

  it(
    'accepts a diagram the portal can draw, saying what kind it is',
    async () => {
      const checked = await validator.checkDiagram('flowchart LR\n  A[Pedido] --> B{¿Stock?}');

      expect(checked.getValue()).toBe('flowchart-v2');
    },
    STARTING_MERMAID_MS,
  );

  it('accepts every family the portal draws, the one shipped apart included', async () => {
    const checked = await Promise.all([
      validator.checkDiagram('architecture-beta\n  service db(logos:postgresql)[Base]'),
      validator.checkDiagram('zenuml\n  Alice->Bob: hola'),
      validator.checkDiagram('mindmap\n  root((MCP))\n    Leer'),
    ]);

    expect(checked.map((result) => result.getValue())).toEqual(['architecture', 'zenuml', 'mindmap']);
  });

  /** Lo que Mermaid dice es lo que el agente necesita para corregir: dónde y qué. */
  it('refuses a diagram Mermaid cannot read, with Mermaid’s own words on where and what', async () => {
    const checked = await validator.checkDiagram('architecture-beta\n    service backend["NestJS", logo:logos:nestjs]');

    expect(checked.getError()).toContain('line 2, column 20');
  });

  it('refuses what is not a diagram at all', async () => {
    expect((await validator.checkDiagram('esto no es un diagrama')).getError()).toContain('No diagram type detected');
  });

  it('checks formulas, on their own line and inside a sentence', () => {
    expect(validator.checkFormula('\\frac{a}{b}', true).isOk()).toBe(true);
    expect(validator.checkFormula('\\frac{a}{', false).getError()).toContain('KaTeX parse error');
  });

  it(
    'starts a new checker when the last one was stopped',
    async () => {
      validator.onModuleDestroy();

      const checked = await validator.checkDiagram('pie title Tareas\n  "Hechas" : 7');

      expect(checked.getValue()).toBe('pie');
    },
    STARTING_MERMAID_MS,
  );
});
