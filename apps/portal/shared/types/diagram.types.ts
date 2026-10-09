export interface DiagramFault {
  readonly line: number | null;
  readonly said: string;
}

export interface DiagramSize {
  readonly height: number;
  readonly width: number;
}

export interface DiagramGrip {
  readonly left: number;
  readonly top: number;
  readonly x: number;
  readonly y: number;
}

export interface DiagramHandling {
  readonly fitToFrame: () => void;
  readonly release: () => void;
  readonly showActualSize: () => void;
  readonly showAtItsSize: () => void;
  readonly zoomBy: (step: number) => void;
}

export interface Drawn {
  readonly fault: DiagramFault | null;
  readonly html: string | null;
}
