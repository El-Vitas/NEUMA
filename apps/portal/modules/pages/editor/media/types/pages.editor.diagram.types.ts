/** Why a diagram could not be drawn, and where in the writing it broke. */
export interface PageEditorDiagramFault {
  readonly line: number | null;
  readonly said: string;
}

/** Where the frame's edge was taken hold of, and how tall the frame was at that moment. */
export interface PageEditorDiagramFrameGrip {
  readonly height: number;
  readonly y: number;
}

/** What the buttons of a diagram are called, since none of them is a stretch of text to read. */
export interface PageEditorDiagramLabels {
  readonly actualSize: string;
  readonly code: string;
  readonly both: string;
  readonly download: string;
  readonly drawing: string;
  readonly fitToFrame: string;
  readonly frameHeight: string;
  readonly frameHeightHint: string;
  readonly fullScreen: string;
  readonly line: string;
  readonly unknown: string;
  readonly zoomIn: string;
  readonly zoomOut: string;
  /** The same three views, named after what is in the box when what is in it is a formula. */
  readonly formula: { readonly both: string; readonly code: string; readonly drawing: string };
}
