import { describe, expect, it, mock } from 'bun:test';

const teachings: string[] = [];
let isEngineReady = false;

/** An engine whose first load fails, like a chunk that fails to load over the network. */
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
