import type { Node as EditorNode } from 'prosemirror-model';
import type { Command, Transaction } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import { PAGE_EDITOR_HEADING_TYPE } from '../constants/pages.editor.heading.constants';
import type { PageEditorFoldedRange } from '../types/pages.editor.heading-fold.types';

const isHeading = (node: EditorNode): boolean => node.type.name === PAGE_EDITOR_HEADING_TYPE;

/** A fold covers everything after its heading up to the next heading of the same or a higher rank. */
export const readPageEditorFoldedRanges = (document: EditorNode): readonly PageEditorFoldedRange[] => {
  const ranges: PageEditorFoldedRange[] = [];
  let folding: { readonly level: number } | null = null;

  document.forEach((node, offset) => {
    const hide = (): number => ranges.push({ from: offset, to: offset + node.nodeSize });
    if (!isHeading(node)) {
      if (folding !== null) hide();
      return;
    }

    const level = Number(node.attrs.level);
    if (folding !== null && level > folding.level) {
      hide();
      return;
    }
    if (folding !== null) folding = null;
    if (node.attrs.collapsed === true) folding = { level };
  });

  return ranges;
};

export const togglePageEditorHeadingFold =
  (position: number): Command =>
  (state, dispatch) => {
    const heading = state.doc.nodeAt(position);
    if (heading === null || !isHeading(heading)) return false;
    dispatch?.(
      state.tr.setNodeMarkup(position, undefined, { ...heading.attrs, collapsed: heading.attrs.collapsed !== true }),
    );
    return true;
  };

export const readPageEditorFoldState = (
  document: EditorNode,
  blockStart: number,
): { readonly isFolded: boolean } | null => {
  const block = document.nodeAt(blockStart);
  if (block === null || !isHeading(block)) return null;
  return { isFolded: block.attrs.collapsed === true };
};

/** Enter at the end of a folded heading unfolds it first: a block added inside the fold would be hidden. */
export const openFoldedHeadingBeforeWriting: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty) return false;
  const heading = $from.parent;
  if (!isHeading(heading) || heading.attrs.collapsed !== true) return false;
  if ($from.parentOffset !== heading.content.size) return false;

  const paragraph = state.schema.nodes.paragraph;
  if (paragraph === undefined) return false;
  if (dispatch === undefined) return true;

  const headingStart = $from.before();
  const insertAt = $from.after();
  const transaction = state.tr.setNodeMarkup(headingStart, undefined, { ...heading.attrs, collapsed: false });
  transaction.insert(insertAt, paragraph.create());
  transaction.setSelection(Selection.near(transaction.doc.resolve(insertAt + 1)));
  dispatch(transaction.scrollIntoView());
  return true;
};

/** A block added at the end of a page that ends inside a fold would be hidden, so those folds are opened. */
export const openFoldsReachingTheEnd = (transaction: Transaction, document: EditorNode): Transaction => {
  const foldedRanges = readPageEditorFoldedRanges(document);
  const lastHidden = foldedRanges.at(-1);
  if (lastHidden === undefined || lastHidden.to < document.content.size) return transaction;

  document.forEach((node, offset) => {
    if (isHeading(node) && node.attrs.collapsed === true) {
      transaction.setNodeMarkup(offset, undefined, { ...node.attrs, collapsed: false });
    }
  });
  return transaction;
};
