import { isPageLinkTarget } from '@neuma/shared';
import type { Command, EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { createPageEditorAskCommand } from '../../lib/pages.editor.ask.lib';
import { pageEditorSchema } from '../../lib/pages.editor.schema';
import type { PageEditorSurfaceRect } from '../../menus/types/pages.editor.surface.types';
import {
  PAGE_EDITOR_LINK_BUBBLE_GAP_PX,
  PAGE_EDITOR_LINK_REQUEST_SELECTOR,
} from '../constants/pages.editor.link.constants';
import type { PageEditorLinkAtHand, PageEditorWrittenLink } from '../types/pages.editor.link.types';

export const isWithinThePages = (href: string): boolean => href.startsWith('/');

/** The link under the selection, whether it covers the whole link or the cursor is just inside it. */
export const readTheLinkInHand = (state: EditorState): PageEditorWrittenLink | null => {
  const { $from, from, to } = state.selection;
  const link = pageEditorSchema.marks.link;
  const carried = $from.marks().find((mark) => mark.type === link) ?? null;
  if (carried === null) return from === to ? null : { from, href: null, to };

  const start = $from.start();
  let reach: PageEditorWrittenLink = { from, href: carried.attrs.href, to };
  $from.parent.forEach((child, offset) => {
    if (!child.marks.some((mark) => mark.eq(carried))) return;
    const childFrom = start + offset;
    if (childFrom <= from && childFrom + child.nodeSize >= to) {
      reach = { from: childFrom, href: carried.attrs.href, to: childFrom + child.nodeSize };
    }
  });
  return reach;
};

/** The link under the pointer and where its bubble goes; hovering avoids moving the cursor, which follows the link. */
export const readTheLinkUnderPointer = (
  view: EditorView,
  target: EventTarget | null,
  surfaceRect: PageEditorSurfaceRect,
): PageEditorLinkAtHand | null => {
  const rested = target instanceof Element ? target.closest('a') : null;
  const href = rested?.getAttribute('href') ?? null;
  if (rested === null || href === null || !view.dom.contains(rested)) return null;

  const from = view.posAtDOM(rested, 0);
  const rect = rested.getBoundingClientRect();
  return {
    link: { from, href, to: from + (rested.textContent?.length ?? 0) },
    spot: { left: rect.left - surfaceRect.left, top: rect.bottom - surfaceRect.top + PAGE_EDITOR_LINK_BUBBLE_GAP_PX },
  };
};

export const createPageLinkCommand =
  (link: PageEditorWrittenLink, href: string | null): Command =>
  (state, dispatch) => {
    if (link.from === link.to) return false;
    if (href !== null && !isPageLinkTarget(href)) return false;
    if (dispatch === undefined) return true;
    const mark = pageEditorSchema.marks.link;
    const transaction = state.tr.removeMark(link.from, link.to, mark);
    dispatch(href === null ? transaction : transaction.addMark(link.from, link.to, mark.create({ href: href.trim() })));
    return true;
  };

/** The field lives outside the editor, so the command reaches it through the request selector. */
export const askForTheLinkField: Command = createPageEditorAskCommand(PAGE_EDITOR_LINK_REQUEST_SELECTOR);
