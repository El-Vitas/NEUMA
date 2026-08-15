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
    nodeViews: createPageEditorNodeViews({
      code: {
        copied: 'Copied',
        copy: 'Copy',
        diagram: {
          both: 'Both',
          code: 'Code',
          download: 'Download',
          drawing: 'Drawing',
          fullScreen: 'Full screen',
          line: 'line',
          unknown: 'no es un diagrama',
          formula: { both: 'código y fórmula', code: 'solo el código', drawing: 'solo la fórmula' },
        },
        language: 'Language',
        languages: { plain: 'No language' },
        wrap: 'Wrap',
      },
      embed: { providers: { youtube: 'YouTube' }, refused: 'Nothing to show:', resize: 'Resize' },
      file: { fullScreen: 'Full screen', resize: 'Resize the document' },
      collection: 'Collection',
      contents: { empty: 'sin encabezados', title: 'en esta página' },
      button: {
        deed: 'Qué hace',
        deeds: { blocks: 'Escribir', row: 'Fila' },
        name: 'Lo que dice',
        needsCollection: 'Elige la colección',
        place: 'Dónde',
        places: { below: 'Debajo', bottom: 'Al final', top: 'Al principio' },
        setup: 'Configurar',
      },
      subpage: { subpage: 'Subpágina', untitled: 'Sin título' },
      synced: { lost: 'ya no está', source: 'ver dónde vive', synced: 'Sincronizado' },
      image: { caption: 'Describe the image', resize: 'Resize' },
      task: 'Task',
      media: {
        fullScreen: 'Full screen',
        mute: 'Mute',
        pause: 'Pause',
        play: 'Play',
        resize: 'Resize',
        seek: 'Position',
        unmute: 'Unmute',
      },
      toggle: { open: 'Toggle', title: 'Toggle title' },
      unsupported: 'Unsupported block',
    }),
    state: createPageEditorState(toggleContent(open), 'Select block'),
  });
  return { container, view };
};

const findArrow = (container: HTMLElement): HTMLElement => {
  const arrow = container.querySelector<HTMLElement>('[data-toggle-arrow]');
  if (arrow === null) throw new Error('the toggle has no arrow to press');
  return arrow;
};

const isOpen = (container: HTMLElement): boolean => findArrow(container).getAttribute('aria-expanded') === 'true';

const isShowingWhatItHolds = (container: HTMLElement): boolean =>
  container.querySelector('[data-toggle-children]')?.hasAttribute('hidden') === false;

const pressArrow = (container: HTMLElement): void => {
  findArrow(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

const readToggleAttrs = (view: EditorView): Record<string, unknown> => view.state.doc.child(0).attrs;

describe('opening and closing a toggle', () => {
  it('renders it closed when the page says nothing about it', () => {
    const { container, view } = mountToggle();

    expect(isOpen(container)).toBe(false);

    view.destroy();
    container.remove();
  });

  it('renders it open when the page was saved open', () => {
    const { container, view } = mountToggle(true);

    expect(isOpen(container)).toBe(true);

    view.destroy();
    container.remove();
  });

  it('opens it when the arrow is pressed', () => {
    const { container, view } = mountToggle();

    pressArrow(container);

    expect(readToggleAttrs(view).open).toBe(true);
    expect(isOpen(container)).toBe(true);

    view.destroy();
    container.remove();
  });

  it('hides what it holds while it is closed, and shows it once opened', () => {
    const { container, view } = mountToggle();

    expect(isShowingWhatItHolds(container)).toBe(false);

    pressArrow(container);

    expect(isShowingWhatItHolds(container)).toBe(true);

    view.destroy();
    container.remove();
  });

  it('answers the keyboard, since the arrow is a button and not a drawing', () => {
    const { container, view } = mountToggle();
    const arrow = findArrow(container);

    expect(arrow.tagName).toBe('BUTTON');
    expect(arrow.getAttribute('aria-label')).toBe('Toggle');

    arrow.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(readToggleAttrs(view).open).toBe(true);

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
    expect(container.querySelector('[data-toggle-children] p')?.textContent).toBe('Dentro');

    view.destroy();
    container.remove();
  });
});

describe('titling a toggle', () => {
  const findTitle = (container: HTMLElement): HTMLInputElement => {
    const title = container.querySelector<HTMLInputElement>('[data-toggle-title]');
    if (title === null) throw new Error('the toggle has no title to write in');
    return title;
  };

  const write = (title: HTMLInputElement, text: string): void => {
    title.value = text;
    title.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('shows the title the page holds', () => {
    const { container, view } = mountToggle();

    expect(findTitle(container).value).toBe('Resumen');

    view.destroy();
    container.remove();
  });

  /**
   * The keyboard answers to whatever holds the focus. Written as content of the
   * editor, the title never received a keystroke: the editor read them all as
   * writing on the page. It is a field of its own, and it is named.
   */
  it('offers the title as a field of its own, named for whoever cannot see it', () => {
    const { container, view } = mountToggle();
    const title = findTitle(container);

    expect(title.tagName).toBe('INPUT');
    expect(title.getAttribute('aria-label')).toBe('Toggle title');
    expect(container.querySelector('summary')).toBeNull();

    view.destroy();
    container.remove();
  });

  it('writes what is typed back into the block', () => {
    const { container, view } = mountToggle();

    write(findTitle(container), 'Otro nombre');

    expect(readToggleAttrs(view).summary).toBe('Otro nombre');

    view.destroy();
    container.remove();
  });

  it('saves a title that was emptied instead of refusing the page', () => {
    const { container, view } = mountToggle();

    write(findTitle(container), '');

    expect(readToggleAttrs(view).summary).toBe('');
    expect(() => serializePageEditorState(view.state)).not.toThrow();

    view.destroy();
    container.remove();
  });

  it('keeps what is being typed while another hand renames the same toggle', () => {
    const { container, view } = mountToggle();
    const title = findTitle(container);

    title.focus();
    write(title, 'Escribiendo');

    expect(title.value).toBe('Escribiendo');
    expect(readToggleAttrs(view).summary).toBe('Escribiendo');

    view.destroy();
    container.remove();
  });
});
