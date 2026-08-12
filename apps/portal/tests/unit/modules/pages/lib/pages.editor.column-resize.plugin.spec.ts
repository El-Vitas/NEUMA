import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { EditorView } from 'prosemirror-view';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const rowOfTwoColumns: PageContent = {
  content: [
    {
      content: [
        { content: [paragraph('Izquierda')], type: 'column' },
        { content: [paragraph('Derecha')], type: 'column' },
      ],
      type: 'column_list',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
};

const ROW_LEFT = 100;
const ROW_WIDTH = 1000;

const mountRow = (): { readonly container: HTMLElement; readonly view: EditorView } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = new EditorView(container, { state: createPageEditorState(rowOfTwoColumns, 'Select block') });
  const row = container.querySelector('[data-column-list]');
  if (row === null) throw new Error('the row is not rendered');
  row.getBoundingClientRect = () =>
    ({
      bottom: 100,
      height: 100,
      left: ROW_LEFT,
      right: ROW_LEFT + ROW_WIDTH,
      top: 0,
      width: ROW_WIDTH,
      x: ROW_LEFT,
      y: 0,
    }) as DOMRect;
  return { container, view };
};

const columnWidths = (view: EditorView): readonly unknown[] =>
  view.state.doc.child(0).children.map((c) => c.attrs.width);

const dragDividerTo = (container: HTMLElement, clientX: number): void => {
  const divider = container.querySelector('[data-column-divider]');
  if (divider === null) throw new Error('the row has no divider');
  divider.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: ROW_LEFT + ROW_WIDTH / 2 }));
  document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX }));
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX }));
};

describe('sharing the width of a row by hand', () => {
  it('offers one divider between every pair of columns', () => {
    const { container, view } = mountRow();

    expect(container.querySelectorAll('[data-column-divider]').length).toBe(1);

    view.destroy();
    container.remove();
  });

  it('gives the columns the share the pointer asks for', () => {
    const { container, view } = mountRow();

    dragDividerTo(container, ROW_LEFT + ROW_WIDTH * 0.3);

    const [left, right] = columnWidths(view);
    expect(left).toBeCloseTo(0.3, 2);
    expect(right).toBeCloseTo(0.7, 2);

    view.destroy();
    container.remove();
  });

  it('keeps what the columns hold while their width changes', () => {
    const { container, view } = mountRow();

    dragDividerTo(container, ROW_LEFT + ROW_WIDTH * 0.7);

    expect(view.state.doc.child(0).children.map((column) => column.textContent)).toEqual(['Izquierda', 'Derecha']);

    view.destroy();
    container.remove();
  });

  it('refuses to squeeze a column out of sight', () => {
    const { container, view } = mountRow();

    dragDividerTo(container, ROW_LEFT + 1);

    const [left] = columnWidths(view);
    expect(typeof left === 'number' && left > 0.1).toBe(true);

    view.destroy();
    container.remove();
  });

  it('leaves the width out of the undo history, because it is not what the page says', () => {
    const { container, view } = mountRow();
    const before = view.state.doc.textContent;

    dragDividerTo(container, ROW_LEFT + ROW_WIDTH * 0.35);

    expect(view.state.doc.textContent).toBe(before);

    view.destroy();
    container.remove();
  });
});
