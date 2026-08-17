import type { EditorView } from 'prosemirror-view';

/** A stretch of the page that answers to what is being looked for. */
export interface PageEditorFindMatch {
  readonly from: number;
  readonly to: number;
}

/** What the search plugin remembers: what is being looked for, and where it was found. */
export interface PageEditorFindState {
  readonly currentIndex: number | null;
  readonly matches: readonly PageEditorFindMatch[];
  readonly query: string;
}

/**
 * What a transaction tells the search plugin to do with what it remembers.
 *
 * `query` recomputes the matches and starts again from the first one; `goto`
 * moves to a match already found, without asking the page anything new; `clear`
 * forgets the search altogether, for when it is closed.
 */
export type PageEditorFindMeta =
  | { readonly type: 'clear' }
  | { readonly index: number; readonly type: 'goto' }
  | { readonly query: string; readonly type: 'query' };

/** One stretch of writing a block holds, at the position it stands in the page. */
export interface PageEditorFindSpan {
  readonly at: number;
  readonly text: string;
}

/** The search panel's own state and the operations that move it, kept apart from the rest of the editor. */
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
  readonly resume: (view: EditorView) => void;
  readonly search: (query: string) => void;
  readonly setReplacement: (replacement: string) => void;
  readonly sync: (view: EditorView) => void;
}
