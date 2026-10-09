import type { Node as EditorNode } from 'prosemirror-model';
import { Plugin as EditorPlugin } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE,
  PAGE_EDITOR_COMMENT_ID_ATTRIBUTE,
  PAGE_EDITOR_COMMENT_MARK_ICON_CLASS,
  PAGE_EDITOR_COMMENT_MARK_ICON_PATH,
  PAGE_EDITOR_COMMENT_MARK_STYLE_CLASS,
  PAGE_EDITOR_COMMENTED_BLOCK_STYLE_CLASS,
  PAGE_EDITOR_SVG_NAMESPACE,
} from '../constants/pages.editor.blocks.constants';
import { openPageEditorBlockCommentsAt, openPageEditorBlockRequest } from './pages.editor.block-menu.lib';

const countBlockComments = (block: EditorNode): number => {
  const comments = block.attrs[PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE];
  return Array.isArray(comments) ? comments.length : 0;
};

const createCommentIcon = (): SVGElement => {
  const icon = document.createElementNS(PAGE_EDITOR_SVG_NAMESPACE, 'svg');
  const outline = document.createElementNS(PAGE_EDITOR_SVG_NAMESPACE, 'path');
  outline.setAttribute('d', PAGE_EDITOR_COMMENT_MARK_ICON_PATH);
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('class', PAGE_EDITOR_COMMENT_MARK_ICON_CLASS);
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('stroke-width', '2');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.append(outline);
  return icon;
};

const createCommentMark = (view: EditorView, blockStart: number, label: string, count: number): HTMLElement => {
  const mark = document.createElement('button');
  const total = document.createElement('span');
  mark.type = 'button';
  mark.className = PAGE_EDITOR_COMMENT_MARK_STYLE_CLASS;
  mark.contentEditable = 'false';
  mark.tabIndex = -1;
  mark.setAttribute('aria-label', label);
  mark.dataset.blockComments = String(count);
  total.textContent = String(count);
  mark.append(createCommentIcon(), total);
  mark.addEventListener('mousedown', (event) => {
    event.preventDefault();
    openPageEditorBlockRequest(view, blockStart, 'comments');
  });
  return mark;
};

/** The block becomes the bubble's frame so the bubble stays level with its middle however tall it is. */
const buildCommentMark = (
  block: EditorNode,
  blockStart: number,
  label: string,
  count: number,
): readonly Decoration[] => [
  Decoration.node(blockStart, blockStart + block.nodeSize, { class: PAGE_EDITOR_COMMENTED_BLOCK_STYLE_CLASS }),
  Decoration.widget(blockStart + 1, (view) => createCommentMark(view, blockStart, label, count), {
    key: `page-editor-block-comments-${String(blockStart)}-${String(count)}`,
    side: -1,
  }),
];

const collectCommentMarks = (document: EditorNode, label: string): readonly Decoration[] => {
  const marks: Decoration[] = [];
  document.descendants((block, blockStart) => {
    const count = countBlockComments(block);
    if (count === 0 || block.isAtom) return;
    marks.push(...buildCommentMark(block, blockStart, label, count));
  });
  return marks;
};

const isPointingAtCommentedText = (event: MouseEvent): boolean =>
  event.target instanceof Element && event.target.closest(`[${PAGE_EDITOR_COMMENT_ID_ATTRIBUTE}]`) !== null;

export const createPageEditorBlockCommentPlugin = (label: string): EditorPlugin =>
  new EditorPlugin({
    props: {
      decorations: (state) => DecorationSet.create(state.doc, [...collectCommentMarks(state.doc, label)]),
      handleClick: (view, place, event) => {
        if (!isPointingAtCommentedText(event)) return false;
        openPageEditorBlockCommentsAt(view, place);
        return true;
      },
    },
  });
