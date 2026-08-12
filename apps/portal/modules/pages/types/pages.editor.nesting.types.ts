import type { Node as EditorNode } from 'prosemirror-model';

export interface PageEditorBlockLocation {
  readonly depth: number;
  readonly index: number;
  readonly node: EditorNode;
  readonly parent: EditorNode;
}
