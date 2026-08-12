import {
  PAGE_EDITOR_PAGE_DROP_OVER_ATTRIBUTE,
  PAGE_EDITOR_PAGE_DROP_TARGET_ATTRIBUTE,
} from '../constants/pages.editor.page-drop.constants';
import type { PageEditorPageDropTarget } from '../types/pages.editor.page-drop.types';

/**
 * The page the pointer is over, when it is over one at all.
 *
 * The tree says which of its rows can receive blocks and which page each one
 * is; the editor only reads that, so neither side has to know how the other is
 * built.
 */
export const findPageEditorPageDropTarget = (event: MouseEvent): PageEditorPageDropTarget | null => {
  if (!(event.target instanceof Element)) return null;
  const row = event.target.closest(`[${PAGE_EDITOR_PAGE_DROP_TARGET_ATTRIBUTE}]`);
  const pageId = row?.getAttribute(PAGE_EDITOR_PAGE_DROP_TARGET_ATTRIBUTE) ?? '';
  return row === null || pageId.length === 0 ? null : { element: row, pageId };
};

/** Shows where the blocks would land, and stops showing it wherever they no longer would. */
export const markPageEditorPageDropTarget = (target: PageEditorPageDropTarget | null): void => {
  for (const marked of document.querySelectorAll(`[${PAGE_EDITOR_PAGE_DROP_OVER_ATTRIBUTE}]`)) {
    if (marked !== target?.element) marked.removeAttribute(PAGE_EDITOR_PAGE_DROP_OVER_ATTRIBUTE);
  }
  target?.element.setAttribute(PAGE_EDITOR_PAGE_DROP_OVER_ATTRIBUTE, 'true');
};
