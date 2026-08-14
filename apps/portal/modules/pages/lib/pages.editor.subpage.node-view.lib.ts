import type { Node as EditorNode } from 'prosemirror-model';
import type { NodeView } from 'prosemirror-view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  PAGE_EDITOR_MARKS,
  PAGE_EDITOR_SUBPAGE_MARK_STYLE_CLASS,
  PAGE_EDITOR_SUBPAGE_NAME_STYLE_CLASS,
  PAGE_EDITOR_SUBPAGE_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorSubpageLabels } from '../types/pages.editor.node-views.types';
import { createPageMark } from './pages.editor.marks.lib';

/**
 * Draws the line that leads to a page hanging from this one.
 *
 * What the page keeps is which page it is, so the name is asked for every time
 * it is drawn: renaming a page is done in the page itself, and everywhere it is
 * named should say what it is called now. The name written down when it was
 * inserted is the fallback, for a child that cannot be read from here — one
 * moved somewhere private, or thrown away — and such a line says so rather than
 * pretending the page is still there.
 */
export const createPageSubpageNodeView = (
  node: EditorNode,
  labels: PageEditorSubpageLabels,
  readTitle: (pageId: string) => string | null,
): NodeView => {
  const link = document.createElement('a');
  const name = document.createElement('span');
  const called = readTitle(node.attrs.pageId);

  link.className = PAGE_EDITOR_SUBPAGE_STYLE_CLASS;
  link.dataset.pageSubpage = node.attrs.pageId;
  link.dataset.spaceId = node.attrs.spaceId;
  link.href = ROUTES.PORTAL_SPACE_PAGE(node.attrs.spaceId, node.attrs.pageId);
  link.contentEditable = 'false';

  const mark = createPageMark(PAGE_EDITOR_MARKS.page);
  mark.setAttribute('class', PAGE_EDITOR_SUBPAGE_MARK_STYLE_CLASS);

  name.className = PAGE_EDITOR_SUBPAGE_NAME_STYLE_CLASS;
  name.textContent = called ?? (node.attrs.label.length > 0 ? node.attrs.label : labels.untitled);
  link.setAttribute('aria-label', `${labels.subpage}: ${name.textContent}`);
  link.append(mark, name);

  return { dom: link, ignoreMutation: () => true, stopEvent: () => true };
};
