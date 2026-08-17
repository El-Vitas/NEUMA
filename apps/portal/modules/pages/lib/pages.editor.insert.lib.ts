import type { Node as EditorNode, NodeType } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';

export const canInsertPageNode = (state: EditorState, nodeType: NodeType): boolean => {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).canReplaceWith($from.index(depth), $from.index(depth), nodeType)) return true;
  }
  return false;
};

/**
 * Puts a block on the page where the cursor is.
 *
 * A block that is selected — a picture, a document, a player — is what someone
 * is looking at, not a hole to drop the next thing into, so the new block lands
 * after it. Replacing it is how a page loses what it was already holding.
 */
export const insertPageNode =
  (node: EditorNode): Command =>
  (state, dispatch) => {
    if (!canInsertPageNode(state, node.type)) return false;
    if (dispatch === undefined) return true;
    /** A selection is asked what it holds rather than what class it is, which is not the same answer twice. */
    const { selection } = state;
    if ('node' in selection) dispatch(state.tr.insert(selection.to, node));
    else dispatch(state.tr.replaceSelectionWith(node));
    return true;
  };
