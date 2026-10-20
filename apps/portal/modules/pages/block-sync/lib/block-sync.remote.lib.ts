import { holdPageContentThisVersionCannotRead, type PageContent } from '@neuma/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { Command, EditorState, Transaction } from 'prosemirror-state';
import { pageEditorSchema } from '../../editor/lib/pages.editor.schema';
import { BLOCK_SYNC_REMOTE_META } from '../constants/block-sync.constants';
import type { BlockChangedRange as ChangedRange } from '../types/block-sync.types';
import { restoreSelectionByBlock } from './block-sync.selection.lib';

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

/**
 * The one transaction that makes the editor say what the blocks say, replacing only the span that differs so
 * the rest of the document stays as it is. The selection goes back to its block, and the transaction is kept out of
 * the undo history.
 */
export const buildRemoteTransaction = (state: EditorState, content: PageContent): Transaction | null => {
  const next = contentToEditorDocument(content);
  const range = findChangedRange(state.doc, next);
  if (range === null) return null;
  const replacement = state.tr.replace(range.start, range.currentEnd, next.slice(range.start, range.nextEnd));
  const isExact = replacement.doc.eq(next);
  const transaction = isExact ? replacement : state.tr.replaceWith(0, state.doc.content.size, next.content);
  const replacedRange = isExact ? range : { currentEnd: state.doc.content.size, nextEnd: next.content.size, start: 0 };
  return restoreSelectionByBlock(transaction, state, replacedRange)
    .setMeta('addToHistory', false)
    .setMeta(BLOCK_SYNC_REMOTE_META, true);
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
