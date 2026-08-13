/** What the two controls of a toggle are called, since neither is a stretch of text to read. */
export interface PageEditorToggleLabels {
  readonly open: string;
  readonly title: string;
}

/** The user-visible names the editor's node views need, kept out of the libs that render them. */
export interface PageEditorNodeViewLabels {
  readonly collection: string;
  readonly task: string;
  readonly toggle: PageEditorToggleLabels;
  readonly unsupported: string;
}
