import {
  PAGE_EDITOR_PAGE_DROP_OVER_ATTRIBUTE,
  PAGE_EDITOR_PAGE_DROP_TARGET_ATTRIBUTE,
} from '../constants/pages.editor.page-drop.constants';
import type { PageEditorPageDropTarget } from '../types/pages.editor.page-drop.types';

/** The tree marks its droppable rows with a data attribute, so the editor never depends on the tree's internals. */
export const findPageEditorPageDropTarget = (event: MouseEvent): PageEditorPageDropTarget | null => {
  if (!(event.target instanceof Element)) return null;
  const row = event.target.closest(`[${PAGE_EDITOR_PAGE_DROP_TARGET_ATTRIBUTE}]`);
  const pageId = row?.getAttribute(PAGE_EDITOR_PAGE_DROP_TARGET_ATTRIBUTE) ?? '';
  return row === null || pageId.length === 0 ? null : { element: row, pageId };
};

export const markPageEditorPageDropTarget = (target: PageEditorPageDropTarget | null): void => {
  for (const marked of document.querySelectorAll(`[${PAGE_EDITOR_PAGE_DROP_OVER_ATTRIBUTE}]`)) {
    if (marked !== target?.element) marked.removeAttribute(PAGE_EDITOR_PAGE_DROP_OVER_ATTRIBUTE);
  }
  target?.element.setAttribute(PAGE_EDITOR_PAGE_DROP_OVER_ATTRIBUTE, 'true');
};
