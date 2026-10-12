import katex from 'katex';
import { describeDiagramFault } from '@/shared/lib/diagram.fault.lib';
import type { Drawn } from '@/shared/types/diagram.types';

/** The source is untrusted: commands that reach outside (links, images, colours) are refused. */
export const drawFormula = (source: string): Drawn => {
  try {
    return {
      fault: null,
      html: katex.renderToString(source, { displayMode: true, output: 'htmlAndMathml', trust: false }),
    };
  } catch (error) {
    return { fault: describeDiagramFault(error), html: null };
  }
};
