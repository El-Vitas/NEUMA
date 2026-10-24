import type { Command, EditorState, Transaction } from 'prosemirror-state';
import type { DiscussionsSummary } from '../../../discussions/types/pages.discussions.types';
import { pageEditorBlockMenuKey, pageEditorDiscussionsKey } from '../../lib/pages.editor.plugin-keys.lib';
import type { PageEditorFragment } from '../types/pages.editor.block-request.types';
import { getPageEditorBlockId } from './pages.editor.block-id.lib';

export const readPageEditorDiscussions = (state: EditorState): DiscussionsSummary | undefined =>
  pageEditorDiscussionsKey.getState(state);

/** Dispatched from the page when its discussions are read or change, so the editor can show where they are. */
export const summarizePageEditorDiscussions = (state: EditorState, summary: DiscussionsSummary): Transaction =>
  state.tr.setMeta(pageEditorDiscussionsKey, summary).setMeta('addToHistory', false);

export const readPageEditorFragmentText = (state: EditorState, fragment: PageEditorFragment): string =>
  state.doc.textBetween(fragment.from, fragment.to, ' ').trim();

/** A change of the document drops the open request; marking words must not close the discussions being read. */
const keepTheRequest = (state: EditorState, transaction: Transaction): Transaction => {
  const request = pageEditorBlockMenuKey.getState(state);
  return request === null || request === undefined ? transaction : transaction.setMeta(pageEditorBlockMenuKey, request);
};

/** The block a request is about, by the id its node carries; null when the node has none. */
export const readPageEditorRequestedBlockId = (state: EditorState, blockStart: number): string | null => {
  const node = blockStart < 0 || blockStart > state.doc.content.size ? null : state.doc.nodeAt(blockStart);
  return node === null ? null : getPageEditorBlockId(node);
};

/** The words get the id of their discussion as a mark, which is how a click on them finds it. */
export const createPageEditorCommentMarkCommand =
  (discussionId: string, fragment: PageEditorFragment): Command =>
  (state, dispatch) => {
    const commentMark = state.schema.marks.comment;
    if (commentMark === undefined || fragment.from >= fragment.to || fragment.to > state.doc.content.size) return false;
    if (dispatch !== undefined) {
      dispatch(
        keepTheRequest(state, state.tr.addMark(fragment.from, fragment.to, commentMark.create({ id: discussionId }))),
      );
    }
    return true;
  };

/** Takes the mark off every stretch that carries it, so no text stays underlined for a discussion that is gone. */
export const createPageEditorCommentUnmarkCommand =
  (discussionId: string): Command =>
  (state, dispatch) => {
    const commentMark = state.schema.marks.comment;
    if (commentMark === undefined) return false;
    if (dispatch !== undefined) {
      dispatch(
        keepTheRequest(state, state.tr.removeMark(0, state.doc.content.size, commentMark.create({ id: discussionId }))),
      );
    }
    return true;
  };

/** Opens the discussions of a block by its id, for a link that names one; false when the block is not here. */
export const createPageEditorOpenDiscussionsCommand =
  (blockId: string, discussionId: string | null): Command =>
  (state, dispatch) => {
    let blockStart: number | null = null;
    state.doc.descendants((node, position) => {
      if (blockStart !== null) return false;
      if (getPageEditorBlockId(node) === blockId) blockStart = position;
      return blockStart === null;
    });
    if (blockStart === null) return false;
    if (dispatch !== undefined) {
      dispatch(
        state.tr.setMeta(pageEditorBlockMenuKey, {
          blockStart,
          ...(discussionId === null ? {} : { discussionId }),
          kind: 'comments',
        }),
      );
    }
    return true;
  };
