import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { EditorView } from 'prosemirror-view';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import { createPageEditorNodeViews } from '@/modules/pages/lib/pages.editor.node-views.lib';

const toggleContent = (open?: boolean): PageContent => ({
  content: [
    {
      attrs: open === undefined ? { summary: 'Resumen' } : { open, summary: 'Resumen' },
      content: [{ content: [{ text: 'Dentro', type: 'text' }], type: 'paragraph' }],
      type: 'toggle',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
});

const mountToggle = (open?: boolean): { readonly container: HTMLElement; readonly view: EditorView } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = new EditorView(container, {
    nodeViews: createPageEditorNodeViews({ collection: 'Collection', task: 'Task' }),
    state: createPageEditorState(toggleContent(open), 'Select block'),
  });
  return { container, view };
};

const findDetails = (container: HTMLElement): HTMLDetailsElement => {
  const details = container.querySelector('details');
  if (details === null) throw new Error('the toggle is not rendered');
  return details;
};

const pressArrow = (container: HTMLElement): void => {
  const arrow = container.querySelector('[data-toggle-arrow]');
  if (arrow === null) throw new Error('the toggle has no arrow to press');
  arrow.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
};

const readToggleAttrs = (view: EditorView): Record<string, unknown> => view.state.doc.child(0).attrs;

describe('opening and closing a toggle', () => {
  it('renders it closed when the page says nothing about it', () => {
    const { container, view } = mountToggle();

    expect(findDetails(container).open).toBe(false);

    view.destroy();
    container.remove();
  });

  it('renders it open when the page was saved open', () => {
    const { container, view } = mountToggle(true);

    expect(findDetails(container).open).toBe(true);

    view.destroy();
    container.remove();
  });

  it('opens it when the arrow is pressed', () => {
    const { container, view } = mountToggle();

    pressArrow(container);

    expect(readToggleAttrs(view).open).toBe(true);
    expect(findDetails(container).open).toBe(true);

    view.destroy();
    container.remove();
  });

  it('closes it again when the arrow is pressed once more', () => {
    const { container, view } = mountToggle(true);

    pressArrow(container);

    expect(readToggleAttrs(view).open).toBe(false);

    view.destroy();
    container.remove();
  });

  it('remembers whether it was open when the page is saved', () => {
    const { container, view } = mountToggle();

    pressArrow(container);

    expect(serializePageEditorState(view.state).content[0]).toMatchObject({
      attrs: { open: true, summary: 'Resumen' },
      type: 'toggle',
    });

    view.destroy();
    container.remove();
  });

  it('keeps what it holds inside, whether open or closed', () => {
    const { container, view } = mountToggle();

    pressArrow(container);

    expect(view.state.doc.child(0).textContent).toBe('Dentro');
    expect(container.querySelector('details p')?.textContent).toBe('Dentro');

    view.destroy();
    container.remove();
  });
});

describe('titling a toggle', () => {
  const findTitle = (container: HTMLElement): HTMLElement => {
    const title = container.querySelector<HTMLElement>('[data-toggle-title]');
    if (title === null) throw new Error('the toggle has no title to write in');
    return title;
  };

  it('shows the title the page holds', () => {
    const { container, view } = mountToggle();

    expect(findTitle(container).textContent).toBe('Resumen');

    view.destroy();
    container.remove();
  });

  it('offers the title for writing', () => {
    const { container, view } = mountToggle();

    expect(findTitle(container).isContentEditable).toBe(true);

    view.destroy();
    container.remove();
  });

  it('writes what is typed back into the block', () => {
    const { container, view } = mountToggle();
    const title = findTitle(container);

    title.textContent = 'Otro nombre';
    title.dispatchEvent(new Event('input', { bubbles: true }));

    expect(readToggleAttrs(view).summary).toBe('Otro nombre');

    view.destroy();
    container.remove();
  });

  it('saves a title that was emptied instead of refusing the page', () => {
    const { container, view } = mountToggle();
    const title = findTitle(container);

    title.textContent = '';
    title.dispatchEvent(new Event('input', { bubbles: true }));

    expect(readToggleAttrs(view).summary).toBe('');
    expect(() => serializePageEditorState(view.state)).not.toThrow();

    view.destroy();
    container.remove();
  });
});
