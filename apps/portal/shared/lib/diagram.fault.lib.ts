import {
  DIAGRAM_FAULT_LINE,
  DIAGRAM_TRAILING_COLON,
  DIAGRAM_UNKNOWN_SAID,
  DIAGRAM_UNSAID,
} from '@/shared/constants/diagram.constants';
import type { DiagramFault } from '@/shared/types/diagram.types';

/**
 * What went wrong with the drawing, said as briefly as it can be said.
 *
 * The line is pulled out of the message because it is the first thing anyone
 * needs and the one thing the message buries: everything after it is the engine
 * quoting itself, which helps nobody looking for what to fix.
 */
export const describeDiagramFault = (fault: unknown): DiagramFault => {
  const said = fault instanceof Error ? fault.message : String(fault ?? DIAGRAM_UNSAID);
  const line = DIAGRAM_FAULT_LINE.exec(said)?.[1];
  const firstLine = (said.split('\n')[0] ?? said).trim();
  return {
    line: line === undefined ? null : Number(line),
    said: firstLine.replace(DIAGRAM_TRAILING_COLON, ''),
  };
};

/**
 * Whether what failed is that the writing is not a diagram at all.
 *
 * It is the one failure that is not about a mistake inside a diagram, and the
 * engine says it in its own words and its own language; the page says it in
 * hers, because whoever wrote a shopping list in a diagram block is not helped
 * by being told about configurations.
 */
export const isDiagramUnknown = (said: string): boolean => DIAGRAM_UNKNOWN_SAID.test(said);
