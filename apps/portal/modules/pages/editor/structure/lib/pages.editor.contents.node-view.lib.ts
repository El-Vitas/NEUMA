import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_CONTENTS_EMPTY_STYLE_CLASS,
  PAGE_EDITOR_CONTENTS_ENTRY_STYLE_CLASS,
  PAGE_EDITOR_CONTENTS_INDENT_REM,
  PAGE_EDITOR_CONTENTS_STYLE_CLASS,
  PAGE_EDITOR_CONTENTS_TITLE_STYLE_CLASS,
} from '../constants/pages.editor.contents.constants';
import type { PageEditorContentsLabels, PageEditorHeading } from '../types/pages.editor.contents.types';
import { goToThePageHeading, readPageHeadings } from './pages.editor.contents.lib';

const createEntry = (view: EditorView, heading: PageEditorHeading): HTMLElement => {
  const entry = document.createElement('button');
  entry.type = 'button';
  entry.className = PAGE_EDITOR_CONTENTS_ENTRY_STYLE_CLASS;
  entry.textContent = heading.title;
  entry.style.marginInlineStart = `${String((heading.level - 1) * PAGE_EDITOR_CONTENTS_INDENT_REM)}rem`;
  entry.addEventListener('mousedown', (event) => event.preventDefault());
  entry.addEventListener('click', () => goToThePageHeading(view, heading.position));
  return entry;
};

/**
 * Lists what a page holds, written by the page itself.
 *
 * It keeps nothing of its own: the headings are read from the writing every
 * time it is redrawn, so an index is never out of date with the page it belongs
 * to and there is nothing to keep in step by hand.
 */
export const createPageContentsNodeView = (
  _node: EditorNode,
  view: EditorView,
  labels: PageEditorContentsLabels,
): NodeView => {
  const container = document.createElement('nav');
  container.className = PAGE_EDITOR_CONTENTS_STYLE_CLASS;
  container.dataset.pageContents = 'true';
  container.contentEditable = 'false';
  container.setAttribute('aria-label', labels.title);

  const show = (): void => {
    const headings = readPageHeadings(view.state.doc);
    const title = document.createElement('p');
    title.className = PAGE_EDITOR_CONTENTS_TITLE_STYLE_CLASS;
    title.textContent = labels.title;
    if (headings.length === 0) {
      const empty = document.createElement('p');
      empty.className = PAGE_EDITOR_CONTENTS_EMPTY_STYLE_CLASS;
      empty.textContent = labels.empty;
      container.replaceChildren(title, empty);
      return;
    }
    container.replaceChildren(title, ...headings.map((heading) => createEntry(view, heading)));
  };

  show();

  return {
    dom: container,
    /** Its own writing never changes; what changes is the page around it, and that is what redraws it. */
    ignoreMutation: () => true,
    stopEvent: () => true,
    update: () => {
      show();
      return true;
    },
  };
};
