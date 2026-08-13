/** A stretch of the page that a folded heading is holding out of sight. */
export interface PageEditorFoldedRange {
  readonly from: number;
  readonly to: number;
}

/** Whether the block the menu is open for can be folded, and how it stands. */
export interface PageEditorBlockFolding {
  readonly isFolded: boolean;
  readonly toggle: () => void;
}
