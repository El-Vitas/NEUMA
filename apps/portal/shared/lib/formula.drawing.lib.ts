import katex from 'katex';
import { describeDiagramFault } from '@/shared/lib/diagram.fault.lib';
import type { Drawn } from '@/shared/types/diagram.types';

/**
 * Sets a formula, or says why it could not be set.
 *
 * What the page keeps is the writing, exactly as with a diagram: the formula is
 * set from it on every visit, so it can be searched, corrected and read years
 * later by a version that sets it differently.
 *
 * Nothing the writing says is trusted with the page: the commands that would
 * reach outside — a link, an image, a colour of somebody else's choosing — are
 * refused, because a formula is written by whoever can write on the page and
 * read by everyone.
 */
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
