export type PageEditorBlockRequestKind = 'actions' | 'button' | 'comments' | 'handover' | 'share' | 'sync';

export interface PageEditorFragment {
  readonly from: number;
  readonly to: number;
}

export interface PageEditorBlockRequest {
  readonly blockStart: number;
  /** The discussion to show first, when the request came from commented words or from a link to one. */
  readonly discussionId?: string;
  readonly fragment?: PageEditorFragment;
  readonly kind: PageEditorBlockRequestKind;
}
