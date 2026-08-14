import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  PAGE_EDITOR_AUDIO_TYPE,
  PAGE_EDITOR_BOOKMARK_TYPE,
  PAGE_EDITOR_CALLOUT_TYPE,
  PAGE_EDITOR_CODE_TYPE,
  PAGE_EDITOR_COLLECTION_CLASS,
  PAGE_EDITOR_CONTENTS_TYPE,
  PAGE_EDITOR_EMBED_TYPE,
  PAGE_EDITOR_FILE_TYPE,
  PAGE_EDITOR_IMAGE_TYPE,
  PAGE_EDITOR_MARKS,
  PAGE_EDITOR_MENTION_MARK_STYLE_CLASS,
  PAGE_EDITOR_MENTION_STYLE_CLASS,
  PAGE_EDITOR_SUBPAGE_TYPE,
  PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH,
  PAGE_EDITOR_TABLE_TYPE,
  PAGE_EDITOR_TASK_ITEM_TYPE,
  PAGE_EDITOR_TOGGLE_TYPE,
  PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE,
  PAGE_EDITOR_UNSUPPORTED_STYLE_CLASS,
  PAGE_EDITOR_UNSUPPORTED_TYPE,
  PAGE_EDITOR_VIDEO_TYPE,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorNodeViewLabels } from '../types/pages.editor.node-views.types';
import { createPageBookmarkNodeView } from './pages.editor.bookmark.node-view.lib';
import { createPageCalloutNodeView } from './pages.editor.callout.node-view.lib';
import { createPageCodeBlockNodeView } from './pages.editor.code.node-view.lib';
import { createPageContentsNodeView } from './pages.editor.contents.node-view.lib';
import { createPageEmbedNodeView } from './pages.editor.embed.node-view.lib';
import { createPageFileNodeView } from './pages.editor.file.node-view.lib';
import { createPageImageNodeView } from './pages.editor.image.node-view.lib';
import { createPageMark } from './pages.editor.marks.lib';
import { createPageAudioNodeView, createPageVideoNodeView } from './pages.editor.media.node-view.lib';
import { createPageSubpageNodeView } from './pages.editor.subpage.node-view.lib';
import { PageTableView } from './pages.editor.table.view.lib';
import { createPageTaskItemNodeView } from './pages.editor.task.node-view.lib';
import { createPageToggleNodeView } from './pages.editor.toggle.node-view.lib';

const getPageAssetUrl = (assetId: string): string => `/api/page-assets/${encodeURIComponent(assetId)}`;

/**
 * Renders a file as what it is: a name, what kind of file it is and how heavy,
 * on a line that takes one press to bring it down. The name is what it was
 * called when it arrived, since that is what whoever saved it will look for.
 */
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

/**
 * A page named in the middle of a sentence.
 *
 * Like the block that leads to a child page, it keeps which page it is and asks
 * what that page is called every time it is drawn; the name written down when
 * it was inserted answers for a page that cannot be read from here — one in
 * another space, or thrown away. The mark of a page in front of it says what
 * kind of thing is being named, and that it lives in the writing rather than on
 * a line of its own is what tells it apart from a page started here.
 */
const createPageMentionNodeView = (node: EditorNode, readPageTitle: (pageId: string) => string | null): NodeView => {
  const link = document.createElement('a');
  const name = document.createElement('span');
  const mark = createPageMark(PAGE_EDITOR_MARKS.page);

  mark.setAttribute('class', PAGE_EDITOR_MENTION_MARK_STYLE_CLASS);
  link.className = PAGE_EDITOR_MENTION_STYLE_CLASS;
  link.href = ROUTES.PORTAL_SPACE_PAGE(node.attrs.spaceId, node.attrs.pageId);
  link.dataset.pageMention = node.attrs.pageId;
  name.textContent = readPageTitle(node.attrs.pageId) ?? node.attrs.label;
  link.append(mark, name);
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
  /** How a page says what it is called now, since what a block keeps is which page it is. */
  readPageTitle: (pageId: string) => string | null = () => null,
): Readonly<
  Record<string, (node: EditorNode, view: EditorView, getPosition: () => number | undefined) => NodeView>
> => ({
  [PAGE_EDITOR_CALLOUT_TYPE]: (node) => createPageCalloutNodeView(node),
  [PAGE_EDITOR_CODE_TYPE]: (node, view, getPosition) =>
    createPageCodeBlockNodeView(node, view, getPosition, labels.code),
  collection: (node) => createPageCollectionNodeView(node, labels.collection),
  [PAGE_EDITOR_CONTENTS_TYPE]: (node, view) => createPageContentsNodeView(node, view, labels.contents),
  [PAGE_EDITOR_FILE_TYPE]: (node, view, getPosition) =>
    createPageFileNodeView(node, view, getPosition, labels.file, getPageAssetUrl),
  [PAGE_EDITOR_IMAGE_TYPE]: (node, view, getPosition) =>
    createPageImageNodeView(node, view, getPosition, labels.image, getPageAssetUrl),
  [PAGE_EDITOR_BOOKMARK_TYPE]: (node) => createPageBookmarkNodeView(node),
  [PAGE_EDITOR_EMBED_TYPE]: (node, view, getPosition) => createPageEmbedNodeView(node, view, getPosition, labels.embed),
  mention: (node) => createPageMentionNodeView(node, readPageTitle),
  /**
   * The table is drawn here rather than by `columnResizing`, whose own drawing
   * would have to be named the way that plugin names it. What a page decides
   * for one of its blocks is decided where every other block is decided.
   */
  [PAGE_EDITOR_TABLE_TYPE]: (node) => new PageTableView(node, PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH),
  [PAGE_EDITOR_VIDEO_TYPE]: (node, view, getPosition) =>
    createPageVideoNodeView(node, view, getPosition, labels.media, getPageAssetUrl),
  [PAGE_EDITOR_AUDIO_TYPE]: (node, view, getPosition) =>
    createPageAudioNodeView(node, view, getPosition, labels.media, getPageAssetUrl),
  [PAGE_EDITOR_TASK_ITEM_TYPE]: (node, view, getPosition) =>
    createPageTaskItemNodeView(node, view, getPosition, labels.task),
  [PAGE_EDITOR_TOGGLE_TYPE]: (node, view, getPosition) =>
    createPageToggleNodeView(node, view, getPosition, labels.toggle),
  [PAGE_EDITOR_SUBPAGE_TYPE]: (node) => createPageSubpageNodeView(node, labels.subpage, readPageTitle),
  [PAGE_EDITOR_UNSUPPORTED_TYPE]: (node) => createPageUnsupportedNodeView(node, labels.unsupported),
});
