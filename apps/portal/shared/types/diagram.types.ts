/** Why something could not be drawn, and where in the writing it broke. */
export interface DiagramFault {
  readonly line: number | null;
  readonly said: string;
}

/** What came of asking for a drawing: the drawing, or the reason there is none. */
export interface Drawn {
  readonly fault: DiagramFault | null;
  readonly html: string | null;
}
