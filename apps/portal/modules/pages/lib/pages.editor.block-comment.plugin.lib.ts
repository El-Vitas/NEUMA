import type { Node as EditorNode } from 'prosemirror-model';
import { Plugin as EditorPlugin } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE,
  PAGE_EDITOR_COMMENT_MARK_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';
import { openPageEditorBlockRequest } from './pages.editor.block-menu.lib';

const countBlockComments = (block: EditorNode): number => {
  const comments = block.attrs[PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE];
  return Array.isArray(comments) ? comments.length : 0;
};

const createCommentMark = (view: EditorView, blockStart: number, label: string, count: number): HTMLElement => {
  const mark = document.createElement('button');
  mark.type = 'button';
  mark.className = PAGE_EDITOR_COMMENT_MARK_STYLE_CLASS;
  mark.contentEditable = 'false';
  mark.tabIndex = -1;
  mark.setAttribute('aria-label', label);
  mark.setAttribute('data-block-comments', String(count));
  mark.textContent = `💬 ${String(count)}`;
  mark.addEventListener('mousedown', (event) => {
    event.preventDefault();
    openPageEditorBlockRequest(view, blockStart, 'comments');
  });
  return mark;
};

const collectCommentMarks = (document: EditorNode, label: string): readonly Decoration[] => {
  const marks: Decoration[] = [];
  document.descendants((block, blockStart) => {
    const count = countBlockComments(block);
    if (count === 0) return;
    marks.push(
      Decoration.widget(blockStart, (view) => createCommentMark(view, blockStart, label, count), {
        key: `page-editor-block-comments-${String(blockStart)}-${String(count)}`,
        side: 1,
      }),
    );
  });
  return marks;
};

/**
 * Marks the blocks that have been talked about with a bubble on their right,
 * which opens what was said and where to say more.
 *
 * A comment nobody can see is a comment nobody answers, so the mark is drawn
 * from the block itself and appears the moment the first remark lands.
 */
export const createPageEditorBlockCommentPlugin = (label: string): EditorPlugin =>
  new EditorPlugin({
    props: {
      decorations: (state) => DecorationSet.create(state.doc, [...collectCommentMarks(state.doc, label)]),
    },
  });
