import { describe, expect, it } from 'bun:test';
import {
  isPageDiagram,
  keepPageDiagramZoomWithinReach,
  readPageDiagramDrawnWidth,
  readPageDiagramView,
} from '@/modules/pages/lib/pages.editor.diagram.lib';

describe('which code blocks are drawings', () => {
  it('is the one written in the language of diagrams', () => {
    expect(isPageDiagram('mermaid')).toBe(true);
    expect(isPageDiagram('typescript')).toBe(false);
    expect(isPageDiagram(null)).toBe(false);
  });
});

describe('what is shown of a diagram', () => {
  /** A diagram is drawn to be looked at, so the drawing is what a page shows unless someone says otherwise. */
  it('shows the drawing until someone asks for something else', () => {
    expect(readPageDiagramView(undefined)).toBe('drawing');
    expect(readPageDiagramView('nada de esto')).toBe('drawing');
    expect(readPageDiagramView('code')).toBe('code');
    expect(readPageDiagramView('both')).toBe('both');
  });
});

describe('how wide a drawing was drawn', () => {
  /** Squeezed into the column, a wide diagram is drawn at half its size and says nothing anyone can read. */
  it('reads the width out of the box the drawing was drawn inside', () => {
    expect(readPageDiagramDrawnWidth('0 0 1858.4 94')).toBe(1858.4);
    expect(readPageDiagramDrawnWidth('  0   0   640   480  ')).toBe(640);
  });

  it('says nothing about a drawing that never said how wide it is', () => {
    expect(readPageDiagramDrawnWidth(null)).toBe(0);
    expect(readPageDiagramDrawnWidth('0 0')).toBe(0);
    expect(readPageDiagramDrawnWidth('0 0 ancho alto')).toBe(0);
  });
});

describe('how close a drawing can be brought', () => {
  /** Brought close enough to read and pushed far enough to see whole, and no further either way. */
  it('stays between the smallest and the largest it is worth reading at', () => {
    expect(keepPageDiagramZoomWithinReach(1.5)).toBe(1.5);
    expect(keepPageDiagramZoomWithinReach(0.01)).toBe(0.25);
    expect(keepPageDiagramZoomWithinReach(40)).toBe(4);
  });
});
