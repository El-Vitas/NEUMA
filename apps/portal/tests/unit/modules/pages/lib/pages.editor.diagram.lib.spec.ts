import { describe, expect, it } from 'bun:test';
import {
  isPageDiagram,
  keepPageDiagramFrameHeightWithinReach,
  readPageDiagramView,
} from '@/modules/pages/editor/media/lib/pages.editor.diagram.lib';

describe('which code blocks are drawings', () => {
  it('is the one written in the language of diagrams', () => {
    expect(isPageDiagram('mermaid')).toBe(true);
    expect(isPageDiagram('typescript')).toBe(false);
    expect(isPageDiagram(null)).toBe(false);
  });
});

describe('what is shown of a diagram', () => {
  it('shows the drawing until someone asks for something else', () => {
    expect(readPageDiagramView(undefined)).toBe('drawing');
    expect(readPageDiagramView('nada de esto')).toBe('drawing');
    expect(readPageDiagramView('code')).toBe('code');
    expect(readPageDiagramView('both')).toBe('both');
  });
});

describe('how tall the frame of a drawing can be made', () => {
  it('stays between the lowest and the tallest a frame may be, in whole pixels', () => {
    expect(keepPageDiagramFrameHeightWithinReach(480.6)).toBe(481);
    expect(keepPageDiagramFrameHeightWithinReach(10)).toBe(120);
    expect(keepPageDiagramFrameHeightWithinReach(99_999)).toBe(2400);
  });
});
