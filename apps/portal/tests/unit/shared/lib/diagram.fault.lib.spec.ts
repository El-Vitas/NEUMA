import { describe, expect, it } from 'bun:test';
import { describeDiagramFault, isDiagramUnknown } from '@/shared/lib/diagram.fault.lib';

describe('what is said when a diagram cannot be drawn', () => {
  it('says which line the drawing broke on', () => {
    const fault = new Error('Parse error on line 3:\n...flowchart TD;\nExpecting SEMI, got INVALID');

    expect(describeDiagramFault(fault)).toEqual({ line: 3, said: 'Parse error on line 3' });
  });

  it('says what it can when there is no line to point at', () => {
    expect(describeDiagramFault(new Error('No diagram type detected'))).toEqual({
      line: null,
      said: 'No diagram type detected',
    });
  });

  it('knows when what was written is not a diagram at all', () => {
    expect(isDiagramUnknown('No diagram type detected matching given configuration for text: hola')).toBe(true);
    expect(isDiagramUnknown('Parse error on line 3')).toBe(false);
  });

  it('says something rather than nothing when what failed is not even an error', () => {
    expect(describeDiagramFault('roto')).toEqual({ line: null, said: 'roto' });
    expect(describeDiagramFault(undefined).said.length).toBeGreaterThan(0);
  });

  it('never shows the reader an object written as [object Object]', () => {
    expect(describeDiagramFault({ hash: { line: 2 } }).said).not.toContain('[object Object]');
  });
});
