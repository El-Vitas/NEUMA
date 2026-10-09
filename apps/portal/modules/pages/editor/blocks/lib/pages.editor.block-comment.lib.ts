import type { PageBlockComment } from '@neuma/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE } from '../constants/pages.editor.blocks.constants';
import { readPageEditorBlockRequest } from './pages.editor.block-menu.lib';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

const isPageBlockComment = (value: unknown): value is PageBlockComment =>
  typeof value === 'object' && value !== null && 'body' in value && 'author' in value;

const readBlockComments = (attrs: Record<string, unknown>): readonly PageBlockComment[] => {
  const comments = attrs[PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE];
  return Array.isArray(comments) ? comments.filter(isPageBlockComment) : [];
};

export const readPageEditorBlockComments = (state: EditorState): readonly PageBlockComment[] => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return [];
  return readBlockComments(range.parent.child(range.startIndex).attrs);
};

/** Comments are stored on the block; a fragment comment also marks its text with the comment id. */
export const createPageEditorBlockCommentCommand =
  (comment: PageBlockComment): Command =>
  (state, dispatch) => {
    const range = findSelectedPageBlocks(state);
    if (range === null || comment.body.trim().length === 0) return false;
    if (dispatch === undefined) return true;

    const block = range.parent.child(range.startIndex);
    const comments = [...readBlockComments(block.attrs), comment];
    const transaction = state.tr;
    const fragment = readPageEditorBlockRequest(state)?.fragment;
    const commentMark = state.schema.marks.comment;
    if (fragment !== undefined && commentMark !== undefined) {
      transaction.addMark(fragment.from, fragment.to, commentMark.create({ id: comment.id }));
    }
    dispatch(transaction.setNodeAttribute(range.start, PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE, comments));
    return true;
  };

/** Also unmarks the fragment pointing at the comment, so no text stays underlined. */
export const createPageEditorBlockCommentRemovalCommand =
  (commentId: string): Command =>
  (state, dispatch) => {
    const range = findSelectedPageBlocks(state);
    if (range === null) return false;

    const block = range.parent.child(range.startIndex);
    const remaining = readBlockComments(block.attrs).filter((comment) => comment.id !== commentId);
    if (remaining.length === readBlockComments(block.attrs).length) return false;
    if (dispatch === undefined) return true;

    const transaction = state.tr;
    const commentMark = state.schema.marks.comment;
    if (commentMark !== undefined) {
      transaction.removeMark(range.start, range.end, commentMark.create({ id: commentId }));
    }
    dispatch(
      transaction.setNodeAttribute(
        range.start,
        PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE,
        remaining.length === 0 ? null : remaining,
      ),
    );
    return true;
  };
