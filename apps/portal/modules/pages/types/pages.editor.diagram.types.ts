/** Why a diagram could not be drawn, and where in the writing it broke. */
export interface PageEditorDiagramFault {
  readonly line: number | null;
  readonly said: string;
}

/** Where a drawing was taken hold of, and where it stood at that moment. */
export interface PageEditorDiagramGrip {
  readonly left: number;
  readonly top: number;
  readonly x: number;
  readonly y: number;
}

/** What the buttons of a diagram are called, since none of them is a stretch of text to read. */
export interface PageEditorDiagramLabels {
  readonly code: string;
  readonly both: string;
  readonly download: string;
  readonly drawing: string;
  readonly fullScreen: string;
  readonly line: string;
  readonly unknown: string;
}
