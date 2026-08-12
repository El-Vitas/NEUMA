/** What a block is being asked for: its actions, what was said about it, or where it is going. */
export type PageEditorBlockRequestKind = 'actions' | 'comments' | 'handover';

/** The stretch of text a question is about, when it is about part of a block and not all of it. */
export interface PageEditorFragment {
  readonly from: number;
  readonly to: number;
}

/** Which block is being asked, what for, and — when it was asked of a fragment — which stretch of it. */
export interface PageEditorBlockRequest {
  readonly blockStart: number;
  readonly fragment?: PageEditorFragment;
  readonly kind: PageEditorBlockRequestKind;
}
