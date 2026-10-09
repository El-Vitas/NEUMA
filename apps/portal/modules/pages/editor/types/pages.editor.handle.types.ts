export interface PagesEditorHandle {
  /** Resolves once pending saves finish, so closing the editor never drops unsaved writing. */
  readonly flushPendingChanges: () => Promise<void>;
}
