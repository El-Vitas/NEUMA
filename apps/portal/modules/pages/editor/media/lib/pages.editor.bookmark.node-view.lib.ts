import { isPageWebAddress } from '@neuma/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BOOKMARK_ABOUT_STYLE_CLASS,
  PAGE_EDITOR_BOOKMARK_ICON_STYLE_CLASS,
  PAGE_EDITOR_BOOKMARK_STYLE_CLASS,
  PAGE_EDITOR_BOOKMARK_TEXT_STYLE_CLASS,
  PAGE_EDITOR_BOOKMARK_TITLE_STYLE_CLASS,
} from '../../blocks/constants/pages.editor.blocks.constants';

const readHost = (url: string): string => (URL.canParse(url) ? new URL(url).hostname : url);

/**
 * Draws the metadata stored when the link was added, never refetched, so rendering does not depend on the site.
 * Falls back to the address when no title was found.
 */
export const createPageBookmarkNodeView = (node: EditorNode): NodeView => {
  const card = document.createElement('a');
  const said = document.createElement('span');
  const title = document.createElement('span');
  const about = document.createElement('span');

  card.className = PAGE_EDITOR_BOOKMARK_STYLE_CLASS;
  card.dataset.pageBookmark = 'true';
  if (isPageWebAddress(node.attrs.url)) card.href = node.attrs.url;
  card.rel = 'noopener noreferrer';
  card.target = '_blank';
  card.contentEditable = 'false';

  if (isPageWebAddress(node.attrs.icon)) {
    const mark = document.createElement('img');
    mark.className = PAGE_EDITOR_BOOKMARK_ICON_STYLE_CLASS;
    mark.src = node.attrs.icon;
    mark.alt = '';
    card.append(mark);
  }

  said.className = PAGE_EDITOR_BOOKMARK_TEXT_STYLE_CLASS;
  title.className = PAGE_EDITOR_BOOKMARK_TITLE_STYLE_CLASS;
  title.dataset.bookmarkTitle = 'true';
  title.textContent =
    typeof node.attrs.title === 'string' && node.attrs.title.length > 0 ? node.attrs.title : readHost(node.attrs.url);
  about.className = PAGE_EDITOR_BOOKMARK_ABOUT_STYLE_CLASS;
  about.textContent =
    typeof node.attrs.description === 'string' && node.attrs.description.length > 0
      ? node.attrs.description
      : node.attrs.url;
  said.append(title, about);
  card.append(said);

  return { dom: card, ignoreMutation: () => true, stopEvent: () => true };
};
