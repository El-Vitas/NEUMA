import type { Node as EditorNode, NodeType } from 'prosemirror-model';

export interface PageEditorBlockRange {
  readonly from: number;
  readonly to: number;
}

export type PageEditorColumnSide = 'left' | 'right';

/** Dropping beside a block (`column`) splits its row into columns. */
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

export type PageEditorBlockHolder = (node: EditorNode) => boolean;
