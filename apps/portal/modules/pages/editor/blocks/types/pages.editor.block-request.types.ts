export type PageEditorBlockRequestKind = 'actions' | 'button' | 'comments' | 'handover' | 'sync';

export interface PageEditorFragment {
  readonly from: number;
  readonly to: number;
}

export interface PageEditorBlockRequest {
  readonly blockStart: number;
  readonly fragment?: PageEditorFragment;
  readonly kind: PageEditorBlockRequestKind;
}
