/** What a block is being asked for: its actions, what was said about it, or where it is going. */
export type PageEditorBlockRequestKind = 'actions' | 'comments' | 'handover';

/** Which block is being asked, and what for. */
export interface PageEditorBlockRequest {
  readonly blockStart: number;
  readonly kind: PageEditorBlockRequestKind;
}
