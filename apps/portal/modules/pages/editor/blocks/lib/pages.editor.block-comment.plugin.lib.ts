import type { Node as EditorNode } from 'prosemirror-model';
import { Plugin as EditorPlugin } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import type { DiscussionsSummary } from '../../../discussions/types/pages.discussions.types';
import { pageEditorDiscussionsKey } from '../../lib/pages.editor.plugin-keys.lib';
import {
  PAGE_EDITOR_COMMENT_ID_ATTRIBUTE,
  PAGE_EDITOR_COMMENT_MARK_ICON_CLASS,
  PAGE_EDITOR_COMMENT_MARK_ICON_PATH,
  PAGE_EDITOR_COMMENT_MARK_STYLE_CLASS,
  PAGE_EDITOR_COMMENTED_BLOCK_STYLE_CLASS,
  PAGE_EDITOR_COMMENTED_TEXT_STYLE_CLASS,
  PAGE_EDITOR_NOTHING_DISCUSSED,
  PAGE_EDITOR_SVG_NAMESPACE,
} from '../constants/pages.editor.blocks.constants';
import { getPageEditorBlockId } from './pages.editor.block-id.lib';
import { openPageEditorBlockCommentsAt, openPageEditorBlockRequest } from './pages.editor.block-menu.lib';

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

const collectBubbles = (document: EditorNode, label: string, summary: DiscussionsSummary): readonly Decoration[] => {
  const marks: Decoration[] = [];
  if (summary.openCounts.size === 0) return marks;
  document.descendants((block, blockStart) => {
    const blockId = getPageEditorBlockId(block);
    const count = blockId === null ? 0 : (summary.openCounts.get(blockId) ?? 0);
    if (count === 0 || block.isAtom) return;
    marks.push(...buildCommentMark(block, blockStart, label, count));
  });
  return marks;
};

/** Only the words of a discussion that is still open are underlined; a resolved one leaves them plain. */
const collectUnderlines = (document: EditorNode, summary: DiscussionsSummary): readonly Decoration[] => {
  const underlines: Decoration[] = [];
  if (summary.openMarkIds.size === 0) return underlines;
  document.descendants((node, position) => {
    const isOpen = node.marks.some(
      (mark) => mark.type.name === 'comment' && summary.openMarkIds.has(String(mark.attrs.id)),
    );
    if (node.isText && isOpen) {
      underlines.push(
        Decoration.inline(position, position + node.nodeSize, { class: PAGE_EDITOR_COMMENTED_TEXT_STYLE_CLASS }),
      );
    }
  });
  return underlines;
};

const readCommentedTextId = (event: MouseEvent): string | null => {
  if (!(event.target instanceof Element)) return null;
  return (
    event.target.closest(`[${PAGE_EDITOR_COMMENT_ID_ATTRIBUTE}]`)?.getAttribute(PAGE_EDITOR_COMMENT_ID_ATTRIBUTE) ??
    null
  );
};

const isSummary = (value: unknown): value is DiscussionsSummary =>
  typeof value === 'object' && value !== null && 'openCounts' in value && 'openMarkIds' in value;

/** The page tells the plugin which discussions are open; a bubble per block and an underline per open quote follow. */
export const createPageEditorBlockCommentPlugin = (label: string): EditorPlugin<DiscussionsSummary> =>
  new EditorPlugin<DiscussionsSummary>({
    key: pageEditorDiscussionsKey,
    props: {
      decorations: (state) => {
        const summary = pageEditorDiscussionsKey.getState(state) ?? PAGE_EDITOR_NOTHING_DISCUSSED;
        return DecorationSet.create(state.doc, [
          ...collectBubbles(state.doc, label, summary),
          ...collectUnderlines(state.doc, summary),
        ]);
      },
      handleClick: (view, place, event) => {
        const markId = readCommentedTextId(event);
        if (markId === null) return false;
        openPageEditorBlockCommentsAt(view, place, markId);
        return true;
      },
    },
    state: {
      apply: (transaction, previous) => {
        const next: unknown = transaction.getMeta(pageEditorDiscussionsKey);
        return isSummary(next) ? next : previous;
      },
      init: () => PAGE_EDITOR_NOTHING_DISCUSSED,
    },
  });
