import { PAGE_LIFECYCLE, type PageLifecycle } from '@neuma/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { resolvePageIconImageUrl } from '../../../appearance/lib/pages.icon.lib';
import type { PageIcon } from '../../../appearance/types/pages.icon.types';
import { resolvePageAssetUrl as getPageAssetUrl } from '../../../attachments/lib/pages.attachments.lib';
import { createPageBookmarkNodeView } from '../../media/lib/pages.editor.bookmark.node-view.lib';
import { createPageEmbedNodeView } from '../../media/lib/pages.editor.embed.node-view.lib';
import { createPageFileNodeView } from '../../media/lib/pages.editor.file.node-view.lib';
import { createPageImageNodeView } from '../../media/lib/pages.editor.image.node-view.lib';
import { createPageAudioNodeView, createPageVideoNodeView } from '../../media/lib/pages.editor.media.node-view.lib';
import { PAGE_EDITOR_BUTTON_TYPE } from '../../structure/constants/pages.editor.button.constants';
import { createPageButtonNodeView } from '../../structure/lib/pages.editor.button.node-view.lib';
import { createPageCalloutNodeView } from '../../structure/lib/pages.editor.callout.node-view.lib';
import { createPageCodeBlockNodeView } from '../../structure/lib/pages.editor.code.node-view.lib';
import { createPageContentsNodeView } from '../../structure/lib/pages.editor.contents.node-view.lib';
import { createPageSubpageNodeView } from '../../structure/lib/pages.editor.subpage.node-view.lib';
import { createPageSyncedNodeView } from '../../structure/lib/pages.editor.synced.node-view.lib';
import { PageTableView } from '../../structure/lib/pages.editor.table.view.lib';
import { createPageTaskItemNodeView } from '../../structure/lib/pages.editor.task.node-view.lib';
import { createPageToggleNodeView } from '../../structure/lib/pages.editor.toggle.node-view.lib';
import { createPageDateNodeView } from '../../text/lib/pages.editor.date.lib';
import { createPageFormulaNodeView } from '../../text/lib/pages.editor.formula.lib';
import { createPageMark } from '../../text/lib/pages.editor.marks.lib';
import { createPagePersonNodeView } from '../../text/lib/pages.editor.person.lib';
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
  PAGE_EDITOR_MENTION_TRASHED_STYLE_CLASS,
  PAGE_EDITOR_MENTION_TRASHED_TAG_STYLE_CLASS,
  PAGE_EDITOR_SUBPAGE_TYPE,
  PAGE_EDITOR_SYNCED_TYPE,
  PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH,
  PAGE_EDITOR_TABLE_TYPE,
  PAGE_EDITOR_TASK_ITEM_TYPE,
  PAGE_EDITOR_TOGGLE_TYPE,
  PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE,
  PAGE_EDITOR_UNSUPPORTED_STYLE_CLASS,
  PAGE_EDITOR_UNSUPPORTED_TYPE,
  PAGE_EDITOR_VIDEO_TYPE,
} from '../constants/pages.editor.blocks.constants';
import type {
  PageEditorMentionTrashedLabels,
  PageEditorNodeViewLabels,
  PageEditorNodeViewReaders,
} from '../types/pages.editor.node-views.types';

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
 * The icon is looked up live, not stored in the mention, so changing a page's icon updates every mention.
 * Unknown pages and drawn symbols fall back to the plain page mark.
 */
const createPageMentionMark = (icon: PageIcon | null): HTMLElement | SVGSVGElement => {
  if (icon?.kind === 'emoji') {
    const emoji = document.createElement('span');
    emoji.setAttribute('aria-hidden', 'true');
    emoji.className = PAGE_EDITOR_MENTION_MARK_STYLE_CLASS;
    emoji.textContent = icon.value;
    return emoji;
  }

  if (icon?.kind === 'image') {
    const picture = document.createElement('img');
    picture.alt = '';
    picture.className = `${PAGE_EDITOR_MENTION_MARK_STYLE_CLASS} object-cover`;
    picture.src = resolvePageIconImageUrl(icon);
    return picture;
  }

  const mark = createPageMark(PAGE_EDITOR_MARKS.page);
  mark.setAttribute('class', PAGE_EDITOR_MENTION_MARK_STYLE_CLASS);
  return mark;
};

/** Flags a trashed page with a text tag and tooltip, so the state does not rely on color alone. */
const markPageMentionAsTrashed = (
  link: HTMLAnchorElement,
  title: string,
  labels: PageEditorMentionTrashedLabels,
): void => {
  const tag = document.createElement('span');
  tag.className = PAGE_EDITOR_MENTION_TRASHED_TAG_STYLE_CLASS;
  tag.textContent = labels.label;
  link.classList.add(...PAGE_EDITOR_MENTION_TRASHED_STYLE_CLASS.split(' '));
  link.title = labels.tooltip(title);
  link.append(tag);
};

/** Falls back to the label stored at insert time when the page cannot be read from here (other space, trashed). */
const createPageMentionNodeView = (
  node: EditorNode,
  readPageTitle: (pageId: string) => string | null,
  readPageIcon: (pageId: string) => PageIcon | null,
  readPageLifecycle: (pageId: string) => PageLifecycle | null,
  trashedLabels: PageEditorMentionTrashedLabels,
): NodeView => {
  const link = document.createElement('a');
  const name = document.createElement('span');
  const title = readPageTitle(node.attrs.pageId) ?? node.attrs.label;

  link.className = PAGE_EDITOR_MENTION_STYLE_CLASS;
  link.href = ROUTES.PORTAL_SPACE_PAGE(node.attrs.spaceId, node.attrs.pageId);
  link.dataset.pageMention = node.attrs.pageId;
  name.textContent = title;
  link.append(createPageMentionMark(readPageIcon(node.attrs.pageId)), name);
  if (readPageLifecycle(node.attrs.pageId) === PAGE_LIFECYCLE.TRASHED)
    markPageMentionAsTrashed(link, title, trashedLabels);
  return { dom: link };
};

/** Placeholder for a block type written by a newer version; not editable here. */
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
  {
    pressTheButton = () => undefined,
    readBorrowed = () => null,
    readButtonTemplates = () => Promise.resolve([]),
    readPageIcon = () => null,
    readPageLifecycle = () => null,
    readPageTitle = () => null,
    readPersonForHover = () => undefined,
  }: PageEditorNodeViewReaders = {},
): Readonly<
  Record<string, (node: EditorNode, view: EditorView, getPosition: () => number | undefined) => NodeView>
> => ({
  [PAGE_EDITOR_BUTTON_TYPE]: (node, view, getPosition) =>
    createPageButtonNodeView(node, view, getPosition, labels.button, pressTheButton, readButtonTemplates),
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
  mention: (node) =>
    createPageMentionNodeView(node, readPageTitle, readPageIcon, readPageLifecycle, labels.mentionTrashed),
  person: (node) => createPagePersonNodeView(node, labels.person, { findMember: readPersonForHover }),
  date: (node, view, getPosition) => createPageDateNodeView(node, view, getPosition, labels.date),
  formula: (node, view, getPosition) => createPageFormulaNodeView(node, view, getPosition, labels.formula),
  // Drawn here instead of by `columnResizing`, which would require naming the table view the way that plugin does.
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
  [PAGE_EDITOR_SYNCED_TYPE]: (node) => createPageSyncedNodeView(node, labels.synced, readBorrowed),
  [PAGE_EDITOR_UNSUPPORTED_TYPE]: (node) => createPageUnsupportedNodeView(node, labels.unsupported),
});
