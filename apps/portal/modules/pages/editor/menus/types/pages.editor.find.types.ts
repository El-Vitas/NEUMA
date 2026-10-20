import type { EditorView } from 'prosemirror-view';

export interface PageEditorFindMatch {
  readonly from: number;
  readonly to: number;
}

export interface PageEditorFindState {
  readonly currentIndex: number | null;
  readonly matches: readonly PageEditorFindMatch[];
  readonly query: string;
}

/** `goto` moves to an already found match without recomputing; `query` recomputes and restarts at the first. */
export type PageEditorFindMeta =
  | { readonly type: 'clear' }
  | { readonly index: number; readonly type: 'goto' }
  | { readonly query: string; readonly type: 'query' };

export interface PageEditorFindSpan {
  readonly at: number;
  readonly text: string;
}

export interface PagesEditorFind {
  readonly close: () => void;
  readonly found: PageEditorFindState;
  readonly goNext: () => void;
  readonly goPrevious: () => void;
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly query: string;
  readonly replace: () => void;
  readonly replaceAll: () => void;
  readonly replacement: string;
  readonly search: (query: string) => void;
  readonly setReplacement: (replacement: string) => void;
  readonly sync: (view: EditorView) => void;
}
