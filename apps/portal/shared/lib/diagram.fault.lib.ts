import {
  DIAGRAM_FAULT_LINE,
  DIAGRAM_TRAILING_COLON,
  DIAGRAM_UNKNOWN_SAID,
  DIAGRAM_UNSAID,
} from '@/shared/constants/diagram.constants';
import type { DiagramFault } from '@/shared/types/diagram.types';

/** Only the first line matters; the rest of the message is the engine quoting itself. */
const readFaultMessage = (fault: unknown): string => {
  if (fault instanceof Error) return fault.message;
  return typeof fault === 'string' ? fault : DIAGRAM_UNSAID;
};

export const describeDiagramFault = (fault: unknown): DiagramFault => {
  const said = readFaultMessage(fault);
  const line = DIAGRAM_FAULT_LINE.exec(said)?.[1];
  const firstLine = (said.split('\n')[0] ?? said).trim();
  return {
    line: line === undefined ? null : Number(line),
    said: firstLine.replace(DIAGRAM_TRAILING_COLON, ''),
  };
};

export const isDiagramUnknown = (said: string): boolean => DIAGRAM_UNKNOWN_SAID.test(said);
