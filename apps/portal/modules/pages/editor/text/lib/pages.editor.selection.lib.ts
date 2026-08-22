import type { ResolvedPos } from 'prosemirror-model';
import {
  AllSelection,
  type Command,
  type EditorState,
  NodeSelection,
  type Selection,
  TextSelection,
} from 'prosemirror-state';
import {
  PAGE_EDITOR_BLOCK_CHILDREN_TYPE,
  PAGE_EDITOR_BLOCK_HOLDER_TYPES,
  PAGE_EDITOR_PAGE_TYPE,
} from '../../blocks/constants/pages.editor.blocks.constants';

const findEnclosingBlockStart = (resolvedPosition: ResolvedPos): number | null => {
  for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
    if (PAGE_EDITOR_BLOCK_HOLDER_TYPES.includes(resolvedPosition.node(depth - 1).type.name)) {
      return resolvedPosition.before(depth);
    }
  }
  return null;
};

/** The block that holds the one starting at `blockStart`, skipping the container its children live in. */
const findHoldingBlockStart = (state: EditorState, blockStart: number): number | null => {
  const resolvedPosition = state.doc.resolve(blockStart);
  for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
    if (resolvedPosition.node(depth).type.name !== PAGE_EDITOR_BLOCK_CHILDREN_TYPE) {
      return resolvedPosition.before(depth);
    }
  }
  return null;
};

/**
 * Selects the block around the cursor, and what holds it when asked again.
 *
 * A block others hang from is selected on its own first: deleting it is then a
 * decision about that block, and taking the whole nesting with its children is
 * a second, deliberate step rather than a surprise.
 */
export const selectEnclosingBlock: Command = (state, dispatch) => {
  const blockStart =
    state.selection instanceof NodeSelection
      ? findHoldingBlockStart(state, state.selection.from)
      : findEnclosingBlockStart(state.selection.$from);
  if (blockStart === null) return false;
  if (dispatch === undefined) return true;

  dispatch(state.tr.setSelection(NodeSelection.create(state.doc, blockStart)));
  return true;
};

export const selectBlockThenDocument: Command = (state, dispatch) => {
  if (state.selection instanceof NodeSelection || state.selection instanceof AllSelection) {
    if (dispatch === undefined) return true;
    dispatch(state.tr.setSelection(new AllSelection(state.doc)));
    return true;
  }
  return selectEnclosingBlock(state, dispatch);
};

export const countSelectedBlocks = (selection: Selection): number => {
  if (selection instanceof NodeSelection) return 1;
  if (!(selection instanceof TextSelection) && !(selection instanceof AllSelection)) return 0;
  let selectedBlocks = 0;
  selection.$from.doc.nodesBetween(selection.from, selection.to, (node, position, parent) => {
    const parentName = parent?.type.name;
    if (node.isBlock && (parentName === PAGE_EDITOR_PAGE_TYPE || parentName === PAGE_EDITOR_BLOCK_CHILDREN_TYPE)) {
      selectedBlocks += 1;
    }
    return position >= 0;
  });
  return selectedBlocks;
};
