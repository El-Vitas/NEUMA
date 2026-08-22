import type { EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_DRAG_GHOST_OFFSET_PX,
  PAGE_EDITOR_DRAG_GHOST_STYLE_CLASS,
  PAGE_EDITOR_EDITABLE_SURFACE_CLASS,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorBlockRange, PageEditorDragGhost } from '../types/pages.editor.block-drag.types';

const collectDraggedBlockElements = (view: EditorView, range: PageEditorBlockRange): readonly HTMLElement[] => {
  const elements: HTMLElement[] = [];
  for (let position = range.from; position < range.to; ) {
    const block = view.state.doc.nodeAt(position);
    if (block === null) break;
    const blockDom = view.nodeDOM(position);
    if (blockDom instanceof HTMLElement) elements.push(blockDom);
    position += block.nodeSize;
  }
  return elements;
};

/**
 * Builds the translucent copy of the blocks that follows the pointer while
 * they are being dragged, so it is the content itself that visibly travels and
 * not only the line marking where it would land.
 *
 * It is drawn beside the editor rather than out on the page, and answers to the
 * same name the editor does: everything a page knows about how a block looks —
 * the walls of a table, the marks of a list — is said of what is inside the
 * editor, so a copy parked anywhere else travels as bare text. It takes no
 * pointer events and is thrown away when the drag ends.
 */
export const createPageEditorDragGhost = (
  view: EditorView,
  range: PageEditorBlockRange,
): PageEditorDragGhost | null => {
  const blocks = collectDraggedBlockElements(view, range);
  const firstBlock = blocks[0];
  if (firstBlock === undefined) return null;

  const ghost = document.createElement('div');
  ghost.className = `${PAGE_EDITOR_EDITABLE_SURFACE_CLASS} ${PAGE_EDITOR_DRAG_GHOST_STYLE_CLASS}`;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.width = `${Math.round(firstBlock.getBoundingClientRect().width)}px`;
  /** The editor's own height and width are meant for the page, never for a copy of one block. */
  ghost.style.minHeight = '0';
  for (const block of blocks) ghost.append(block.cloneNode(true));
  (view.dom.parentElement ?? view.dom.ownerDocument.body).append(ghost);

  return {
    moveTo: (clientX, clientY) => {
      ghost.style.transform = `translate3d(${clientX + PAGE_EDITOR_DRAG_GHOST_OFFSET_PX}px, ${clientY + PAGE_EDITOR_DRAG_GHOST_OFFSET_PX}px, 0)`;
    },
    remove: () => ghost.remove(),
  };
};
