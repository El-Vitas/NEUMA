import type { Node as EditorNode, Schema } from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';

export interface PageEditorPasteInput {
  readonly hasSelection: boolean;
  readonly html: string;
  readonly plainText: string;
  readonly wantedPlainText: boolean;
}

export type PageEditorPasteDecision =
  | { readonly kind: 'default' }
  | { readonly kind: 'own-slice' }
  | { readonly kind: 'plain-text'; readonly text: string }
  | { readonly kind: 'too-large'; readonly text: string }
  | { readonly kind: 'link-at-cursor'; readonly url: string }
  | { readonly kind: 'link-over-selection'; readonly url: string }
  | { readonly kind: 'markdown-blocks'; readonly nodes: readonly EditorNode[] };

export interface PageEditorPasteTarget {
  readonly dispatch: (transaction: Transaction) => void;
  readonly state: EditorState;
}

export type PageEditorMarkdownMarkKind = 'code' | 'em' | 'link' | 'strike' | 'strong';

export interface PageEditorMarkdownInlineMatch {
  readonly index: number;
  readonly kind: PageEditorMarkdownMarkKind;
  readonly label: string;
  readonly length: number;
  readonly url: string | null;
}

export interface PageEditorMarkdownGroup {
  readonly block: EditorNode;
  readonly next: number;
}

export interface PageEditorMarkdownLineMatcher {
  readonly read: (schema: Schema, lines: readonly string[], start: number) => PageEditorMarkdownGroup;
  readonly test: (line: string) => boolean;
}
