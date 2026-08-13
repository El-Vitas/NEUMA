import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_TOGGLE_ARROW_OPEN_STYLE_CLASS,
  PAGE_EDITOR_TOGGLE_ARROW_STYLE_CLASS,
  PAGE_EDITOR_TOGGLE_CHILDREN_STYLE_CLASS,
  PAGE_EDITOR_TOGGLE_HEAD_STYLE_CLASS,
  PAGE_EDITOR_TOGGLE_TITLE_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorToggleLabels } from '../types/pages.editor.node-views.types';

const createToggleArrow = (label: string): HTMLButtonElement => {
  const arrow = document.createElement('button');
  arrow.type = 'button';
  arrow.className = PAGE_EDITOR_TOGGLE_ARROW_STYLE_CLASS;
  arrow.dataset.toggleArrow = 'true';
  arrow.setAttribute('aria-label', label);
  arrow.textContent = '▸';
  return arrow;
};

/**
 * The line a toggle is named on.
 *
 * It is a field of its own rather than writable content, because the keyboard
 * always answers to whatever holds the focus: a stretch of writable text inside
 * the editor belongs to the editor, which reads every keystroke as writing on
 * the page and never lets the title have one.
 */
const createToggleTitle = (summary: string, label: string): HTMLInputElement => {
  const title = document.createElement('input');
  title.type = 'text';
  title.className = PAGE_EDITOR_TOGGLE_TITLE_STYLE_CLASS;
  title.dataset.toggleTitle = 'true';
  title.setAttribute('aria-label', label);
  title.value = summary;
  return title;
};

/**
 * Renders a toggle the reader can open, name and fill.
 *
 * It is not built out of `<details>`: a `<summary>` takes the focus for itself
 * and the title inside it never received a keystroke. What it holds is hidden
 * while it is closed, and the arrow is a real button, so the toggle answers a
 * finger and the keyboard alike.
 *
 * Whether it is open lives in the block rather than in the browser, which is why
 * the page reopens the way it was left.
 */
export const createPageToggleNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorToggleLabels,
): NodeView => {
  const toggle = document.createElement('div');
  const head = document.createElement('div');
  const arrow = createToggleArrow(labels.open);
  const title = createToggleTitle(node.attrs.summary, labels.title);
  const children = document.createElement('div');

  const showOpenState = (open: boolean): void => {
    arrow.setAttribute('aria-expanded', String(open));
    arrow.classList.toggle(PAGE_EDITOR_TOGGLE_ARROW_OPEN_STYLE_CLASS, open);
    children.toggleAttribute('hidden', !open);
  };

  toggle.dataset.pageToggle = 'true';
  head.className = PAGE_EDITOR_TOGGLE_HEAD_STYLE_CLASS;
  head.contentEditable = 'false';
  children.className = PAGE_EDITOR_TOGGLE_CHILDREN_STYLE_CLASS;
  children.dataset.toggleChildren = 'true';
  head.append(arrow, title);
  toggle.append(head, children);
  showOpenState(node.attrs.open === true);

  const writeAttribute = (name: string, value: boolean | string): void => {
    const position = getPosition();
    if (position === undefined) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, name, value));
  };

  arrow.addEventListener('mousedown', (event) => event.preventDefault());
  arrow.addEventListener('click', (event) => {
    event.preventDefault();
    writeAttribute('open', arrow.getAttribute('aria-expanded') !== 'true');
  });
  title.addEventListener('input', () => writeAttribute('summary', title.value));

  return {
    contentDOM: children,
    dom: toggle,
    ignoreMutation: (mutation) => !children.contains(mutation.target),
    stopEvent: (event) => event.target instanceof Node && head.contains(event.target),
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      showOpenState(updatedNode.attrs.open === true);
      if (document.activeElement !== title && title.value !== updatedNode.attrs.summary) {
        title.value = updatedNode.attrs.summary;
      }
      return true;
    },
  };
};
