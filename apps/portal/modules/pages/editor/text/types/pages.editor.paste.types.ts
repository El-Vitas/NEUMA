import type { Node as EditorNode, Schema } from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';

/** What was on the clipboard, read down to what a decision about it needs. */
export interface PageEditorPasteInput {
  readonly hasSelection: boolean;
  readonly html: string;
  readonly plainText: string;
  readonly wantedPlainText: boolean;
}

/** What a paste is asked to become, decided without touching the page itself. */
export type PageEditorPasteDecision =
  | { readonly kind: 'default' }
  | { readonly kind: 'own-slice' }
  | { readonly kind: 'plain-text'; readonly text: string }
  | { readonly kind: 'too-large'; readonly text: string }
  | { readonly kind: 'link-at-cursor'; readonly url: string }
  | { readonly kind: 'link-over-selection'; readonly url: string }
  | { readonly kind: 'markdown-blocks'; readonly nodes: readonly EditorNode[] };

/** As much of an editor view as writing a decision onto the page needs. */
export interface PageEditorPasteTarget {
  readonly dispatch: (transaction: Transaction) => void;
  readonly state: EditorState;
}

/** The one mark a stretch of pasted Markdown can carry, told apart by the signs written around it. */
export type PageEditorMarkdownMarkKind = 'code' | 'em' | 'link' | 'strike' | 'strong';

/** Where an inline mark starts in what is left to read, and what it should carry once it is made. */
export interface PageEditorMarkdownInlineMatch {
  readonly index: number;
  readonly kind: PageEditorMarkdownMarkKind;
  readonly label: string;
  readonly length: number;
  readonly url: string | null;
}

/** One block read out of pasted Markdown, and the line it leaves reading to pick up from. */
export interface PageEditorMarkdownGroup {
  readonly block: EditorNode;
  readonly next: number;
}

/** What tells a line of pasted Markdown apart, and how to read the block it starts. */
export interface PageEditorMarkdownLineMatcher {
  readonly read: (schema: Schema, lines: readonly string[], start: number) => PageEditorMarkdownGroup;
  readonly test: (line: string) => boolean;
}
