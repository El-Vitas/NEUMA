/** What a block is being asked for: its actions, what was said about it, where it is going, or where it is also to be shown. */
export type PageEditorBlockRequestKind = 'actions' | 'button' | 'comments' | 'handover' | 'sync';

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
