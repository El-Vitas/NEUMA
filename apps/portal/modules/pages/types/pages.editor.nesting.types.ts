import type { NodeType } from 'prosemirror-model';

export interface PageEditorNestingTypes {
  readonly blockChildren: NodeType;
  readonly nestedBlock: NodeType;
}
