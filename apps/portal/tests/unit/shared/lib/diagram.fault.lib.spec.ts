import { describe, expect, it } from 'bun:test';
import { describeDiagramFault, isDiagramUnknown } from '@/shared/lib/diagram.fault.lib';

describe('what is said when a diagram cannot be drawn', () => {
  /** The line is the first thing anyone needs, and it is the one thing the message hides. */
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

  /** Writing that is not a diagram at all is the one failure the page explains in its own words. */
  it('knows when what was written is not a diagram at all', () => {
    expect(isDiagramUnknown('No diagram type detected matching given configuration for text: hola')).toBe(true);
    expect(isDiagramUnknown('Parse error on line 3')).toBe(false);
  });

  it('says something rather than nothing when what failed is not even an error', () => {
    expect(describeDiagramFault('roto')).toEqual({ line: null, said: 'roto' });
    expect(describeDiagramFault(undefined).said.length).toBeGreaterThan(0);
  });
});
