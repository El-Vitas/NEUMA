export interface PageEditorFoldedRange {
  readonly from: number;
  readonly to: number;
}

export interface PageEditorBlockFolding {
  readonly isFolded: boolean;
  readonly toggle: () => void;
}
