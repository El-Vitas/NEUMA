import { describe, expect, it, mock } from 'bun:test';

const teachings: string[] = [];
let isEngineReady = false;

/** Un motor que la primera vez no termina de aprender, como cuando falla la carga de una parte por la red. */
const mermaidEngine = {
  initialize: mock(() => undefined),
  registerExternalDiagrams: mock(() => {
    teachings.push('taught');
    if (isEngineReady) return Promise.resolve();
    isEngineReady = true;
    return Promise.reject(new Error('Loading chunk failed'));
  }),
  registerIconPacks: mock(() => undefined),
  registerLayoutLoaders: mock(() => undefined),
  render: mock(() => Promise.resolve({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><g></g></svg>' })),
};

mock.module('mermaid', () => ({ default: mermaidEngine }));
mock.module('@mermaid-js/layout-elk', () => ({ default: [] }));
mock.module('@mermaid-js/mermaid-zenuml', () => ({ default: {} }));

const { drawDiagram } = await import('@/shared/lib/diagram.drawing.lib');

describe('drawDiagram when the engine fails to get ready', () => {
  /** Un tropiezo al cargar el motor no puede dejar todos los diagramas en blanco por el resto de la sesión. */
  it('says why the first diagram could not be drawn, and draws the next one', async () => {
    const first = await drawDiagram('graph TD; A-->B');
    const second = await drawDiagram('graph TD; A-->B');

    expect(first.html).toBeNull();
    expect(first.fault).not.toBeNull();
    expect(second.fault).toBeNull();
    expect(second.html).not.toBeNull();
    expect(teachings).toHaveLength(2);
  });
});
