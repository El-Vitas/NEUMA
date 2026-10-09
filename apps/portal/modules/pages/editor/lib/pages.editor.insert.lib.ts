import type { Node as EditorNode, NodeType } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';

export const canInsertPageNode = (state: EditorState, nodeType: NodeType): boolean => {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).canReplaceWith($from.index(depth), $from.index(depth), nodeType)) return true;
  }
  return false;
};

/** A selected block (image, file, player) is never replaced: the new block lands after it. */
export const insertPageNode =
  (node: EditorNode): Command =>
  (state, dispatch) => {
    if (!canInsertPageNode(state, node.type)) return false;
    if (dispatch === undefined) return true;
    const { selection } = state;
    if ('node' in selection) dispatch(state.tr.insert(selection.to, node));
    else dispatch(state.tr.replaceSelectionWith(node));
    return true;
  };
