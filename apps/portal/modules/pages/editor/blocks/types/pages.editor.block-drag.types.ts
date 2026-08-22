import type { Node as EditorNode, NodeType } from 'prosemirror-model';

export interface PageEditorBlockRange {
  readonly from: number;
  readonly to: number;
}

export type PageEditorColumnSide = 'left' | 'right';

/**
 * Where the dragged blocks would land: between two blocks, or beside one of
 * them, which splits that row into columns.
 */
export type PageEditorDropPlacement =
  | { readonly insertAt: number; readonly kind: 'between' }
  | { readonly blockStart: number; readonly kind: 'column'; readonly side: PageEditorColumnSide };

export interface PageEditorBlockDrop {
  readonly copy: boolean;
  readonly placement: PageEditorDropPlacement;
  readonly range: PageEditorBlockRange;
}

export interface PageEditorBlockMove {
  readonly copy: boolean;
  readonly insertAt: number;
  readonly range: PageEditorBlockRange;
}

export interface PageEditorBlockDragState {
  readonly placement: PageEditorDropPlacement | null;
  readonly range: PageEditorBlockRange | null;
}

export interface PageEditorDropPointer {
  readonly clientX: number;
  readonly clientY: number;
}

export interface PageEditorDragGhost {
  readonly moveTo: (clientX: number, clientY: number) => void;
  readonly remove: () => void;
}

export interface PageEditorColumnTypes {
  readonly column: NodeType;
  readonly columnList: NodeType;
}

export interface PageEditorColumnDrop {
  readonly blockStart: number;
  readonly copy: boolean;
  readonly range: PageEditorBlockRange;
  readonly side: PageEditorColumnSide;
}

export interface PageEditorColumnRowCleanup {
  readonly kept: readonly EditorNode[];
  readonly position: number;
  readonly row: EditorNode;
}

export interface PageEditorColumnRow {
  readonly columns: readonly EditorNode[];
  readonly start: number;
}

export interface PageEditorGutterLabels {
  readonly insertBlock: string;
  readonly selectBlock: string;
}

export interface PageEditorRowColumn {
  readonly column: EditorNode;
  readonly right: number;
  readonly start: number;
}

/** Decides which nodes hand over their children as blocks of their own. */
export type PageEditorBlockHolder = (node: EditorNode) => boolean;
