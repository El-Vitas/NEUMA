export interface PageEditorDiagramFault {
  readonly line: number | null;
  readonly said: string;
}

export interface PageEditorDiagramFrameGrip {
  readonly height: number;
  readonly y: number;
}

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
  /** Labels used instead of the plain ones when the content is a formula. */
  readonly formula: { readonly both: string; readonly code: string; readonly drawing: string };
}
