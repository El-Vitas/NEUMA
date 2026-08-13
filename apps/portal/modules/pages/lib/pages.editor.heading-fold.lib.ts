import type { Node as EditorNode } from 'prosemirror-model';
import type { Command, Transaction } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import { PAGE_EDITOR_HEADING_TYPE } from '../constants/pages.editor.heading.constants';
import type { PageEditorFoldedRange } from '../types/pages.editor.heading-fold.types';

const isHeading = (node: EditorNode): boolean => node.type.name === PAGE_EDITOR_HEADING_TYPE;

/**
 * What a folded heading takes with it.
 *
 * Everything after it belongs to it until a heading of the same rank or a
 * louder one arrives — a deeper heading is part of what was folded, so it goes
 * too, and with it whatever it was holding.
 */
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

/** Folds or unfolds the heading standing at a position, and remembers it on the page. */
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

/** Whether the block a menu was opened for is one that folds, and how it stands right now. */
export const readPageEditorFoldState = (
  document: EditorNode,
  blockStart: number,
): { readonly isFolded: boolean } | null => {
  const block = document.nodeAt(blockStart);
  if (block === null || !isHeading(block)) return null;
  return { isFolded: block.attrs.collapsed === true };
};

/**
 * Answers Enter at the end of a folded heading by opening it first.
 *
 * Anything written while it stays folded is born out of sight — the fold owns
 * everything after the heading, so there is no "after" to write into — and the
 * page reads as if it had stopped accepting anything. Someone writing on a
 * heading is asking to work there, so what it holds comes back into view and
 * the writing carries on as it would anywhere else.
 */
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

/**
 * Opens every fold that reaches the end of the page.
 *
 * A fold owns everything after its heading until one of the same rank or
 * louder, so the last fold on a page owns the end of it. A block added there
 * would be born out of sight, which is how a page stops offering anywhere to
 * write. Whoever adds one is shown where it went.
 */
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
