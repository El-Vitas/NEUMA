import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  PAGE_EDITOR_CALLOUT_TYPE,
  PAGE_EDITOR_CODE_TYPE,
  PAGE_EDITOR_COLLECTION_CLASS,
  PAGE_EDITOR_FILE_ABOUT_STYLE_CLASS,
  PAGE_EDITOR_FILE_NAME_STYLE_CLASS,
  PAGE_EDITOR_FILE_STYLE_CLASS,
  PAGE_EDITOR_IMAGE_TYPE,
  PAGE_EDITOR_TASK_ITEM_TYPE,
  PAGE_EDITOR_TOGGLE_TYPE,
  PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE,
  PAGE_EDITOR_UNSUPPORTED_STYLE_CLASS,
  PAGE_EDITOR_UNSUPPORTED_TYPE,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorNodeViewLabels } from '../types/pages.editor.node-views.types';
import { createPageCalloutNodeView } from './pages.editor.callout.node-view.lib';
import { createPageCodeBlockNodeView } from './pages.editor.code.node-view.lib';
import { describePageFile } from './pages.editor.file.lib';
import { createPageImageNodeView } from './pages.editor.image.node-view.lib';
import { createPageTaskItemNodeView } from './pages.editor.task.node-view.lib';
import { createPageToggleNodeView } from './pages.editor.toggle.node-view.lib';

const getPageAssetUrl = (assetId: string): string => `/api/page-assets/${encodeURIComponent(assetId)}`;

/**
 * Renders a file as what it is: a name, what kind of file it is and how heavy,
 * on a line that takes one press to bring it down. The name is what it was
 * called when it arrived, since that is what whoever saved it will look for.
 */
const createPageFileNodeView = (node: EditorNode): NodeView => {
  const link = document.createElement('a');
  const name = document.createElement('span');
  const about = document.createElement('span');

  link.className = PAGE_EDITOR_FILE_STYLE_CLASS;
  link.href = getPageAssetUrl(node.attrs.assetId);
  link.rel = 'noopener';
  link.download = typeof node.attrs.caption === 'string' ? node.attrs.caption : '';
  link.dataset.pageFile = 'true';
  name.className = PAGE_EDITOR_FILE_NAME_STYLE_CLASS;
  name.textContent = node.attrs.caption || node.attrs.assetId;
  about.className = PAGE_EDITOR_FILE_ABOUT_STYLE_CLASS;
  about.dataset.fileAbout = 'true';
  about.textContent = describePageFile(node.attrs.caption, node.attrs.mimeType, node.attrs.size);
  link.append(name, about);
  return { dom: link };
};

const createPageCollectionNodeView = (node: EditorNode, label: string): NodeView => {
  const host = document.createElement('div');
  host.className = PAGE_EDITOR_COLLECTION_CLASS;
  host.contentEditable = 'false';
  host.setAttribute('aria-label', label);
  host.dataset.pageCollection = node.attrs.pageId;
  host.dataset.spaceId = node.attrs.spaceId;
  if (typeof node.attrs.viewName === 'string' && node.attrs.viewName.length > 0) {
    host.dataset.viewName = node.attrs.viewName;
  }
  return { dom: host };
};

const createPageMentionNodeView = (node: EditorNode): NodeView => {
  const link = document.createElement('a');
  link.className =
    'text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  link.href = ROUTES.PORTAL_SPACE_PAGE(node.attrs.spaceId, node.attrs.pageId);
  link.textContent = node.attrs.label;
  return { dom: link };
};

/**
 * A block written by a version that knows more than this one, drawn as what it
 * is: something held on the page, named, and plainly not editable here.
 */
const createPageUnsupportedNodeView = (node: EditorNode, label: string): NodeView => {
  const placeholder = document.createElement('div');
  placeholder.className = PAGE_EDITOR_UNSUPPORTED_STYLE_CLASS;
  placeholder.contentEditable = 'false';
  placeholder.setAttribute(PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE, node.attrs.name);
  placeholder.textContent = `${label} · ${node.attrs.name}`;
  return { dom: placeholder };
};

export const createPageEditorNodeViews = (
  labels: PageEditorNodeViewLabels,
): Readonly<
  Record<string, (node: EditorNode, view: EditorView, getPosition: () => number | undefined) => NodeView>
> => ({
  [PAGE_EDITOR_CALLOUT_TYPE]: (node) => createPageCalloutNodeView(node),
  [PAGE_EDITOR_CODE_TYPE]: (node, view, getPosition) =>
    createPageCodeBlockNodeView(node, view, getPosition, labels.code),
  collection: (node) => createPageCollectionNodeView(node, labels.collection),
  file: createPageFileNodeView,
  [PAGE_EDITOR_IMAGE_TYPE]: (node, view, getPosition) =>
    createPageImageNodeView(node, view, getPosition, labels.image, getPageAssetUrl),
  mention: createPageMentionNodeView,
  [PAGE_EDITOR_TASK_ITEM_TYPE]: (node, view, getPosition) =>
    createPageTaskItemNodeView(node, view, getPosition, labels.task),
  [PAGE_EDITOR_TOGGLE_TYPE]: (node, view, getPosition) =>
    createPageToggleNodeView(node, view, getPosition, labels.toggle),
  [PAGE_EDITOR_UNSUPPORTED_TYPE]: (node) => createPageUnsupportedNodeView(node, labels.unsupported),
});
