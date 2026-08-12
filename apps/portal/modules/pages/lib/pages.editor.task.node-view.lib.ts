import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_TASK_BOX_DONE_STYLE_CLASSES,
  PAGE_EDITOR_TASK_CHECKBOX_STYLE_CLASS,
  PAGE_EDITOR_TASK_CONTENT_STYLE_CLASS,
  PAGE_EDITOR_TASK_DONE_MARK,
  PAGE_EDITOR_TASK_DONE_STYLE_CLASSES,
  PAGE_EDITOR_TASK_ITEM_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';

/**
 * The box a task is ticked in.
 *
 * It is a button rather than a checkbox of the browser's own: what the page
 * holds is the single answer to whether the task is done, and a native checkbox
 * would keep a second answer of its own that can drift from it.
 */
const createTaskCheckbox = (label: string): HTMLButtonElement => {
  const checkbox = document.createElement('button');
  checkbox.className = PAGE_EDITOR_TASK_CHECKBOX_STYLE_CLASS;
  checkbox.type = 'button';
  checkbox.contentEditable = 'false';
  checkbox.setAttribute('role', 'checkbox');
  checkbox.setAttribute('aria-label', label);
  return checkbox;
};

const showTaskDoneState = (item: HTMLElement, checkbox: HTMLButtonElement, isDone: boolean): void => {
  checkbox.setAttribute('aria-checked', String(isDone));
  checkbox.textContent = isDone ? PAGE_EDITOR_TASK_DONE_MARK : '';
  item.toggleAttribute('data-checked', isDone);
  for (const className of PAGE_EDITOR_TASK_DONE_STYLE_CLASSES) item.classList.toggle(className, isDone);
  for (const className of PAGE_EDITOR_TASK_BOX_DONE_STYLE_CLASSES) checkbox.classList.toggle(className, isDone);
};

/**
 * Renders a task the reader can tick off.
 *
 * Whether it is done lives in the block itself rather than in the browser's own
 * checkbox state, so the page remembers it and the mark survives moving the
 * block, saving the page and opening it again.
 */
export const createPageTaskItemNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  label: string,
): NodeView => {
  const item = document.createElement('li');
  const checkbox = createTaskCheckbox(label);
  const content = document.createElement('div');
  let task = node;

  item.className = PAGE_EDITOR_TASK_ITEM_STYLE_CLASS;
  item.setAttribute('data-task-item', 'true');
  content.className = PAGE_EDITOR_TASK_CONTENT_STYLE_CLASS;
  item.append(checkbox, content);
  showTaskDoneState(item, checkbox, node.attrs.checked === true);

  const writeDoneState = (event: Event): void => {
    event.preventDefault();
    const position = getPosition();
    if (position === undefined) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, 'checked', task.attrs.checked !== true));
  };

  checkbox.addEventListener('mousedown', (event) => event.preventDefault());
  checkbox.addEventListener('click', writeDoneState);

  return {
    contentDOM: content,
    dom: item,
    ignoreMutation: (mutation) => !content.contains(mutation.target),
    stopEvent: (event) => event.target === checkbox,
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      task = updatedNode;
      showTaskDoneState(item, checkbox, updatedNode.attrs.checked === true);
      return true;
    },
  };
};
