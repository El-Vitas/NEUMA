import { describe, expect, it } from 'bun:test';
import {
  findMcpArchitectureGroupingFault,
  listMcpDiagramIcons,
  listMcpDrawings,
} from '@/modules/mcp/lib/mcp.drawings.lib';

const drawn = (language: string, text: string) => ({
  attrs: { language },
  content: [{ text, type: 'text' }],
  type: 'code_block',
});

describe('listMcpDrawings', () => {
  it('finds every diagram and formula, in a block or inside a line, with the block it is in', () => {
    const nodes = [
      { content: [{ text: 'hola', type: 'text' }], type: 'paragraph' },
      drawn('mermaid', 'flowchart LR\n  A --> B'),
      drawn('latex', '\\frac{a}{b}'),
      drawn('python', 'print(1)'),
      {
        content: [{ content: [{ attrs: { latex: 'x^2' }, type: 'formula' }], type: 'paragraph' }],
        type: 'callout',
      },
    ];

    expect(listMcpDrawings(nodes)).toEqual([
      { block: 2, kind: 'diagram', source: 'flowchart LR\n  A --> B' },
      { block: 3, kind: 'formula', source: '\\frac{a}{b}' },
      { block: 5, kind: 'inline formula', source: 'x^2' },
    ]);
  });
});

describe('listMcpDiagramIcons', () => {
  it('names the icons a diagram uses, in an architecture diagram and in a flowchart node', () => {
    const source = [
      'architecture-beta',
      '  group api(cloud)[API]',
      '  service db(logos:postgresql)[Base] in api',
      'flowchart LR',
      '  A@{ icon: "mdi:server", label: "API" }',
    ].join('\n');

    expect(listMcpDiagramIcons(source)).toEqual(['logos:postgresql', 'mdi:server', 'cloud']);
  });

  /** Sin paquete, un ícono de arquitectura que Mermaid no trae se dibuja como un signo de pregunta. */
  it('names the icons without a pack on groups and services, and nothing a flowchart writes in parentheses', () => {
    const source = [
      'architecture-beta',
      '  group client(laptop)[Cliente]',
      '  service api(server)[API] in client',
      'flowchart LR',
      '  A(Texto redondo) --> B',
    ].join('\n');

    expect(listMcpDiagramIcons(source)).toEqual(['laptop', 'server']);
  });
});

/** Mermaid dibuja estos diagramas sin quejarse, pero con las cajas vacías a un lado y los servicios sueltos. */
describe('findMcpArchitectureGroupingFault', () => {
  it('finds nothing wrong when every group holds something, a nested group included', () => {
    const source = [
      '---',
      'title: Plataforma',
      '---',
      'architecture-beta',
      'group cloud(cloud)[Nube]',
      'group data(database)[Datos] in cloud',
      'service db(logos:postgresql)["PostgreSQL"] in data',
      'service web(internet)[Web]',
      'db:L -- R:web',
    ].join('\n');

    expect(findMcpArchitectureGroupingFault(source)).toBeNull();
  });

  it('names a service indented under a group that it is not in, and how to put it there', () => {
    const source = [
      'architecture-beta',
      '    group data(mdi:database)[Datos]',
      '        service db(logos:postgresql)["PostgreSQL"]',
    ].join('\n');

    expect(findMcpArchitectureGroupingFault(source)).toBe(
      'the service db is indented under the group data but is not in it: indentation groups nothing in architecture-beta. End its line with "in data".',
    );
  });

  it('names a group left with nothing in it', () => {
    const source = ['architecture-beta', 'group data(database)[Datos]', 'service db(database)[Base]'].join('\n');

    expect(findMcpArchitectureGroupingFault(source)).toBe(
      'the group data has nothing in it. End the line of each service that belongs there with "in data", or remove the group.',
    );
  });

  it('leaves alone any diagram that is not an architecture one', () => {
    const source = ['flowchart LR', '  subgraph data', '    A --> B', '  end'].join('\n');

    expect(findMcpArchitectureGroupingFault(source)).toBeNull();
  });

  it('reads the group a line ends in even when its label has spaces and parentheses', () => {
    const source = [
      'architecture-beta',
      'group api(cloud)[API]',
      'service db(logos:postgresql)["Base de datos (principal)"] in api',
    ].join('\n');

    expect(findMcpArchitectureGroupingFault(source)).toBeNull();
  });
});

/** Un texto escrito para trabar la revisión no la traba: lo que se busca en él se busca línea por línea. */
describe('diagram text written to slow the check down', () => {
  it('checks a diagram padded with thousands of empty lines at once', () => {
    const source = `flowchart TD\n A-->B${'\n'.repeat(20_000)}x`;
    const startedAt = performance.now();

    listMcpDiagramIcons(source);
    findMcpArchitectureGroupingFault(source);

    expect(performance.now() - startedAt).toBeLessThan(50);
  });
});
