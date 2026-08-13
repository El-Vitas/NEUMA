import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { EditorView } from 'prosemirror-view';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import { createPageEditorNodeViews } from '@/modules/pages/lib/pages.editor.node-views.lib';

const taskContent = (checked?: boolean): PageContent => ({
  content: [
    {
      content: [
        {
          attrs: checked === undefined ? {} : { checked },
          content: [{ content: [{ text: 'Pagar la cuenta', type: 'text' }], type: 'paragraph' }],
          type: 'task_item',
        },
      ],
      type: 'task_list',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
});

const mountTask = (checked?: boolean): { readonly container: HTMLElement; readonly view: EditorView } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = new EditorView(container, {
    nodeViews: createPageEditorNodeViews({
      code: { copy: 'Copy', language: 'Language', languages: { plain: 'No language' }, wrap: 'Wrap' },
      collection: 'Collection',
      image: { caption: 'Describe the image', resize: 'Resize' },
      task: 'Task',
      toggle: { open: 'Toggle', title: 'Toggle title' },
      unsupported: 'Unsupported block',
    }),
    state: createPageEditorState(taskContent(checked), 'Select block'),
  });
  return { container, view };
};

const findCheckbox = (container: HTMLElement): HTMLElement => {
  const checkbox = container.querySelector<HTMLElement>('li[data-task-item] [role="checkbox"]');
  if (checkbox === null) throw new Error('the task has no checkbox');
  return checkbox;
};

const isTicked = (container: HTMLElement): boolean => findCheckbox(container).getAttribute('aria-checked') === 'true';

const tick = (container: HTMLElement): void => {
  findCheckbox(container).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

const readTaskAttrs = (view: EditorView): Record<string, unknown> => view.state.doc.child(0).child(0).attrs;

describe('ticking a task off', () => {
  it('renders it undone when the page says nothing about it', () => {
    const { container, view } = mountTask();

    expect(isTicked(container)).toBe(false);

    view.destroy();
    container.remove();
  });

  it('renders it done when the page was saved done', () => {
    const { container, view } = mountTask(true);

    expect(isTicked(container)).toBe(true);

    view.destroy();
    container.remove();
  });

  it('writes into the block that it is done, not only into the checkbox', () => {
    const { container, view } = mountTask();

    tick(container);

    expect(readTaskAttrs(view).checked).toBe(true);
    expect(isTicked(container)).toBe(true);

    view.destroy();
    container.remove();
  });

  it('lets it be undone again, without the checkbox drifting from the block', () => {
    const { container, view } = mountTask();

    tick(container);
    tick(container);

    expect(readTaskAttrs(view).checked).toBe(false);
    expect(isTicked(container)).toBe(false);

    view.destroy();
    container.remove();
  });

  it('remembers it when the page is saved', () => {
    const { container, view } = mountTask();

    tick(container);

    expect(serializePageEditorState(view.state).content[0]).toMatchObject({
      content: [{ attrs: { checked: true }, type: 'task_item' }],
      type: 'task_list',
    });

    view.destroy();
    container.remove();
  });

  it('keeps the text of the task writable', () => {
    const { container, view } = mountTask();

    tick(container);

    expect(view.state.doc.textContent).toBe('Pagar la cuenta');
    expect(container.querySelector('li[data-task-item] p')?.textContent).toBe('Pagar la cuenta');

    view.destroy();
    container.remove();
  });
});
