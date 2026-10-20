import { holdPageContentThisVersionCannotRead, type PageContent } from '@neuma/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import { type Command, type EditorState, TextSelection, type Transaction } from 'prosemirror-state';
import { pageEditorSchema } from '../../editor/lib/pages.editor.schema';
import { BLOCK_SYNC_REMOTE_META } from '../constants/block-sync.constants';
import type { BlockChangedRange as ChangedRange } from '../types/block-sync.types';

export const contentToEditorDocument = (content: PageContent): EditorNode =>
  pageEditorSchema.nodeFromJSON(holdPageContentThisVersionCannotRead(content));

export const isRemoteTransaction = (transaction: Transaction): boolean =>
  transaction.getMeta(BLOCK_SYNC_REMOTE_META) === true;

const findChangedRange = (current: EditorNode, next: EditorNode): ChangedRange | null => {
  const start = current.content.findDiffStart(next.content);
  const end = current.content.findDiffEnd(next.content);
  if (start === null || end === null) return null;
  const overlap = start - Math.min(end.a, end.b);
  return overlap > 0
    ? { currentEnd: end.a + overlap, nextEnd: end.b + overlap, start }
    : { currentEnd: end.a, nextEnd: end.b, start };
};

const isInsideWriting = (document: EditorNode, position: number): boolean =>
  position >= 0 && position <= document.content.size && document.resolve(position).parent.inlineContent;

/** A cursor inside replaced text keeps its distance from the start of it instead of jumping to the end. */
const keepCursorInsideReplacedText = (
  transaction: Transaction,
  before: EditorState,
  range: ChangedRange,
): Transaction => {
  const { anchor, head } = before.selection;
  const isInside = (position: number): boolean => position > range.start && position < range.currentEnd;
  if (!isInside(anchor) && !isInside(head)) return transaction;
  const keep = (position: number): number =>
    isInside(position)
      ? range.start + Math.min(position - range.start, range.nextEnd - range.start)
      : transaction.mapping.map(position);
  const nextAnchor = keep(anchor);
  const nextHead = keep(head);
  if (!isInsideWriting(transaction.doc, nextAnchor) || !isInsideWriting(transaction.doc, nextHead)) return transaction;
  return transaction.setSelection(TextSelection.create(transaction.doc, nextAnchor, nextHead));
};

/**
 * The one transaction that makes the editor say what the blocks say, replacing only the span that differs so
 * the writer's cursor and the rest of the document stay as they are. It is kept out of the undo history.
 */
export const buildRemoteTransaction = (state: EditorState, content: PageContent): Transaction | null => {
  const next = contentToEditorDocument(content);
  const range = findChangedRange(state.doc, next);
  if (range === null) return null;
  let transaction = state.tr.replace(range.start, range.currentEnd, next.slice(range.start, range.nextEnd));
  if (transaction.doc.eq(next)) {
    transaction = keepCursorInsideReplacedText(transaction, state, range);
  } else {
    transaction = state.tr.replaceWith(0, state.doc.content.size, next.content);
  }
  return transaction.setMeta('addToHistory', false).setMeta(BLOCK_SYNC_REMOTE_META, true);
};

/** Runs on the editor through its command handle: replaces what differs from `content` and nothing else. */
export const createReplaceContentCommand =
  (content: PageContent): Command =>
  (state, dispatch) => {
    const transaction = buildRemoteTransaction(state, content);
    if (transaction === null) return false;
    dispatch?.(transaction);
    return true;
  };
