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
 * Renders a link kept as a card: the mark of the site, what it is called, and
 * where it points.
 *
 * What is drawn is what the page wrote down when the link arrived, not what the
 * site says today: a page reads the same tomorrow, and asking again on every
 * render would make a page depend on somewhere else being up.
 *
 * A link nobody could read a title for is drawn as its own address, which is
 * the truest thing there is to say about it.
 */
export const createPageBookmarkNodeView = (node: EditorNode): NodeView => {
  const card = document.createElement('a');
  const said = document.createElement('span');
  const title = document.createElement('span');
  const about = document.createElement('span');

  card.className = PAGE_EDITOR_BOOKMARK_STYLE_CLASS;
  card.dataset.pageBookmark = 'true';
  card.href = node.attrs.url;
  card.rel = 'noopener noreferrer';
  card.target = '_blank';
  card.contentEditable = 'false';

  if (typeof node.attrs.icon === 'string' && node.attrs.icon.length > 0) {
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
