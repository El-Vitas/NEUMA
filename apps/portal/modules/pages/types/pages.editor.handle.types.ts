/** What a page editor lets whoever holds it ask for from the outside. */
export interface PagesEditorHandle {
  /** Waits for whatever this editor still has to save, so closing it never throws away what was written. */
  readonly flushPendingChanges: () => Promise<void>;
}
