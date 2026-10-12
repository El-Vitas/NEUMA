import type { Node as EditorNode } from 'prosemirror-model';
import type { NodeView } from 'prosemirror-view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  PAGE_EDITOR_MARKS,
  PAGE_EDITOR_SUBPAGE_MARK_STYLE_CLASS,
  PAGE_EDITOR_SUBPAGE_NAME_STYLE_CLASS,
  PAGE_EDITOR_SUBPAGE_STYLE_CLASS,
} from '../../blocks/constants/pages.editor.blocks.constants';
import type { PageEditorSubpageLabels } from '../../blocks/types/pages.editor.node-views.types';
import { createPageMark } from '../../text/lib/pages.editor.marks.lib';

/**
 * The title is read from the live page list on every draw so renames show up; the title stored in the node
 * is only the fallback when the child cannot be read from here.
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
