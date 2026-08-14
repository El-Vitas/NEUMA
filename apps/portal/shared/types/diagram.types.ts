/** Why a diagram could not be drawn, and where in the writing it broke. */
export interface DiagramFault {
  readonly line: number | null;
  readonly said: string;
}

/** What came of asking for a drawing: the drawing, or the reason there is none. */
export interface DrawnDiagram {
  readonly fault: DiagramFault | null;
  readonly svg: string | null;
}
