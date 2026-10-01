/** Why something could not be drawn, and where in the writing it broke. */
export interface DiagramFault {
  readonly line: number | null;
  readonly said: string;
}

/** How big something is on the screen: a drawing, or the room it has to be shown in. */
export interface DiagramSize {
  readonly height: number;
  readonly width: number;
}

/** Where a drawing was taken hold of, and where it stood at that moment. */
export interface DiagramGrip {
  readonly left: number;
  readonly top: number;
  readonly x: number;
  readonly y: number;
}

/**
 * What a drawing can be asked to do by whoever reads it: be brought closer,
 * pushed away, fitted or shown at its size — and let go of when it is gone.
 */
export interface DiagramHandling {
  readonly fitToFrame: () => void;
  readonly release: () => void;
  readonly showActualSize: () => void;
  readonly showAtItsSize: () => void;
  readonly zoomBy: (step: number) => void;
}

/** What came of asking for a drawing: the drawing, or the reason there is none. */
export interface Drawn {
  readonly fault: DiagramFault | null;
  readonly html: string | null;
}
