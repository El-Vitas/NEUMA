import { AllSelection, type Command, NodeSelection, type Selection, TextSelection } from 'prosemirror-state';

const findEnclosingBlockStart = (selection: Selection): number | null => {
  const resolvedPosition = selection.$from;
  for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
    const parentName = resolvedPosition.node(depth - 1).type.name;
    if (parentName === 'doc' || parentName === 'block_children') return resolvedPosition.before(depth);
  }
  return null;
};

export const selectEnclosingBlock: Command = (state, dispatch) => {
  if (state.selection instanceof NodeSelection) return false;
  const blockStart = findEnclosingBlockStart(state.selection);
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
    if (node.isBlock && (parentName === 'doc' || parentName === 'block_children')) selectedBlocks += 1;
    return position >= 0;
  });
  return selectedBlocks;
};
