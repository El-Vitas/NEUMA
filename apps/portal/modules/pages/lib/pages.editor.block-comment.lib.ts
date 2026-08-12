import type { PageBlockComment } from '@company-brain/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE } from '../constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

const isPageBlockComment = (value: unknown): value is PageBlockComment =>
  typeof value === 'object' && value !== null && 'body' in value && 'author' in value;

const readBlockComments = (attrs: Record<string, unknown>): readonly PageBlockComment[] => {
  const comments = attrs[PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE];
  return Array.isArray(comments) ? comments.filter(isPageBlockComment) : [];
};

/** What has been said about the block a gesture is aimed at. */
export const readPageEditorBlockComments = (state: EditorState): readonly PageBlockComment[] => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return [];
  return readBlockComments(range.parent.child(range.startIndex).attrs);
};

/**
 * Leaves a remark on the block a gesture is aimed at.
 *
 * The remark is kept by the block itself, so moving the block takes its
 * comments along and reloading the page brings them back.
 */
export const createPageEditorBlockCommentCommand =
  (comment: PageBlockComment): Command =>
  (state, dispatch) => {
    const range = findSelectedPageBlocks(state);
    if (range === null || comment.body.trim().length === 0) return false;
    if (dispatch === undefined) return true;

    const block = range.parent.child(range.startIndex);
    const comments = [...readBlockComments(block.attrs), comment];
    dispatch(state.tr.setNodeAttribute(range.start, PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE, comments));
    return true;
  };

/** Takes a remark off the block, for when it no longer says anything useful. */
export const createPageEditorBlockCommentRemovalCommand =
  (commentId: string): Command =>
  (state, dispatch) => {
    const range = findSelectedPageBlocks(state);
    if (range === null) return false;

    const block = range.parent.child(range.startIndex);
    const remaining = readBlockComments(block.attrs).filter((comment) => comment.id !== commentId);
    if (remaining.length === readBlockComments(block.attrs).length) return false;
    if (dispatch === undefined) return true;

    dispatch(
      state.tr.setNodeAttribute(
        range.start,
        PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE,
        remaining.length === 0 ? null : remaining,
      ),
    );
    return true;
  };
