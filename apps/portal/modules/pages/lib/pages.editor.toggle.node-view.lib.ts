import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_TOGGLE_ARROW_OPEN_STYLE_CLASS,
  PAGE_EDITOR_TOGGLE_ARROW_STYLE_CLASS,
  PAGE_EDITOR_TOGGLE_SUMMARY_STYLE_CLASS,
  PAGE_EDITOR_TOGGLE_TITLE_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';

const createToggleArrow = (): HTMLElement => {
  const arrow = document.createElement('span');
  arrow.className = PAGE_EDITOR_TOGGLE_ARROW_STYLE_CLASS;
  arrow.dataset.toggleArrow = 'true';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.contentEditable = 'false';
  arrow.textContent = '▸';
  return arrow;
};

const createToggleTitle = (summary: string): HTMLElement => {
  const title = document.createElement('span');
  title.className = PAGE_EDITOR_TOGGLE_TITLE_STYLE_CLASS;
  title.dataset.toggleTitle = 'true';
  title.contentEditable = 'true';
  title.textContent = summary;
  return title;
};

/**
 * Renders a toggle the reader can actually open, title and fill.
 *
 * The browser never opens a `<summary>` inside editable content, so the open
 * state lives in the block itself: the arrow writes it as an attribute and the
 * page remembers it. The title is written in place and mirrored back to the
 * same block, while what the toggle holds stays editor content.
 */
export const createPageToggleNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
): NodeView => {
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const arrow = createToggleArrow();
  const title = createToggleTitle(node.attrs.summary);
  const children = document.createElement('div');

  const showOpenState = (open: boolean): void => {
    details.open = open;
    arrow.classList.toggle(PAGE_EDITOR_TOGGLE_ARROW_OPEN_STYLE_CLASS, open);
  };

  details.dataset.pageToggle = 'true';
  showOpenState(node.attrs.open === true);
  summary.className = PAGE_EDITOR_TOGGLE_SUMMARY_STYLE_CLASS;
  summary.append(arrow, title);
  details.append(summary, children);

  const writeAttribute = (name: string, value: boolean | string): void => {
    const position = getPosition();
    if (position === undefined) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, name, value));
  };

  summary.addEventListener('click', (event) => event.preventDefault());
  arrow.addEventListener('mousedown', (event) => {
    event.preventDefault();
    writeAttribute('open', !details.open);
  });
  title.addEventListener('input', () => writeAttribute('summary', title.textContent ?? ''));

  return {
    contentDOM: children,
    dom: details,
    ignoreMutation: (mutation) => !children.contains(mutation.target),
    stopEvent: (event) => event.target instanceof Node && summary.contains(event.target),
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      showOpenState(updatedNode.attrs.open === true);
      if (title.textContent !== updatedNode.attrs.summary) title.textContent = updatedNode.attrs.summary;
      return true;
    },
  };
};
