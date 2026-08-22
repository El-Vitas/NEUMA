import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { undo } from 'prosemirror-history';
import type { Command, EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BLOCK_HANDLE_CLASS,
  PAGE_EDITOR_DROP_INDICATOR_CLASS,
} from '@/modules/pages/editor/blocks/constants/pages.editor.blocks.constants';
import { createPageEditorDragGhost } from '@/modules/pages/editor/blocks/lib/pages.editor.block-drag.ghost.lib';
import {
  computePageEditorAutoScrollStep,
  createPageEditorBlockMoveCommand,
  getPageEditorDragRange,
  resolvePageEditorDropPosition,
} from '@/modules/pages/editor/blocks/lib/pages.editor.block-drag.lib';
import { findPageEditorBlockAtPointer } from '@/modules/pages/editor/blocks/lib/pages.editor.block-target.lib';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import {
  pageEditorBlockDragKey,
  pageEditorBlockHandleKey,
} from '@/modules/pages/editor/lib/pages.editor.plugin-keys.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const asPageContent = (content: PageContentNode[]): PageContent => ({
  content,
  schemaVersion: 1,
  type: 'doc',
});

const threeParagraphs = asPageContent([paragraph('Primero'), paragraph('Segundo'), paragraph('Tercero')]);

const createState = (content: PageContent = threeParagraphs): EditorState =>
  createPageEditorState(content, 'Select block');

const findBlockStart = (state: EditorState, text: string): number => {
  let blockStart: number | null = null;
  state.doc.descendants((node, position) => {
    if (blockStart === null && node.isBlock && node.textContent === text) blockStart = position;
  });
  if (blockStart === null) throw new Error(`block "${text}" not found`);
  return blockStart;
};

const findParagraphStart = (state: EditorState, text: string): number => {
  let blockStart: number | null = null;
  state.doc.descendants((node, position) => {
    if (blockStart === null && node.type.name === 'paragraph' && node.textContent === text) blockStart = position;
  });
  if (blockStart === null) throw new Error(`paragraph "${text}" not found`);
  return blockStart;
};

const blockTexts = (state: EditorState): readonly string[] => state.doc.children.map((node) => node.textContent);

const applyCommand = (state: EditorState, command: Command): EditorState => {
  let next = state;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

const moveBlock = (
  state: EditorState,
  parameters: { readonly copy?: boolean; readonly insertAt: number; readonly text: string },
): EditorState => {
  const range = getPageEditorDragRange(state, findBlockStart(state, parameters.text));
  if (range === null) throw new Error(`block "${parameters.text}" is not draggable`);
  return applyCommand(
    state,
    createPageEditorBlockMoveCommand({ copy: parameters.copy ?? false, insertAt: parameters.insertAt, range }),
  );
};

describe('resolving where a dropped block lands', () => {
  it('places the block before the target when dropping on its upper half', () => {
    const state = createState();

    const insertAt = resolvePageEditorDropPosition(state, {
      blockStart: findBlockStart(state, 'Segundo'),
      placeAfter: false,
    });

    expect(insertAt).toBe(findBlockStart(state, 'Segundo'));
  });

  it('places the block after the target when dropping on its lower half', () => {
    const state = createState();
    const blockStart = findBlockStart(state, 'Segundo');

    const insertAt = resolvePageEditorDropPosition(state, { blockStart, placeAfter: true });

    expect(insertAt).toBe(findBlockStart(state, 'Tercero'));
  });

  it('reports nothing for a position that holds no block', () => {
    const state = createState();

    expect(resolvePageEditorDropPosition(state, { blockStart: state.doc.content.size, placeAfter: true })).toBeNull();
  });
});

describe('choosing which blocks travel with the drag', () => {
  it('drags the hovered block on its own', () => {
    const state = createState();

    const range = getPageEditorDragRange(state, findBlockStart(state, 'Segundo'));

    expect(range).toEqual({ from: 9, to: 18 });
  });

  it('drags every block the selection spans when the hovered block is one of them', () => {
    const state = createState();
    const spanning = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 17)));

    const range = getPageEditorDragRange(spanning, findBlockStart(spanning, 'Primero'));

    expect(range).toEqual({ from: 0, to: 18 });
  });

  it('drags only the hovered block when the selection sits elsewhere', () => {
    const state = createState();
    const elsewhere = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 5)));

    const range = getPageEditorDragRange(elsewhere, findBlockStart(elsewhere, 'Tercero'));

    expect(range).toEqual({ from: 18, to: 27 });
  });
});

describe('moving a block with the pointer', () => {
  it('moves a block below the ones that followed it', () => {
    const state = createState();

    const moved = moveBlock(state, { insertAt: state.doc.content.size, text: 'Primero' });

    expect(blockTexts(moved)).toEqual(['Segundo', 'Tercero', 'Primero']);
  });

  it('moves a block above the ones that preceded it', () => {
    const state = createState();

    const moved = moveBlock(state, { insertAt: 0, text: 'Tercero' });

    expect(blockTexts(moved)).toEqual(['Tercero', 'Primero', 'Segundo']);
  });

  it('moves every selected block together, keeping their order', () => {
    const state = createState();
    const spanning = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 17)));

    const moved = moveBlock(spanning, { insertAt: spanning.doc.content.size, text: 'Primero' });

    expect(blockTexts(moved)).toEqual(['Tercero', 'Primero', 'Segundo']);
  });

  it('carries the children along when the dragged block has nested blocks', () => {
    const state = createState(
      asPageContent([
        {
          content: [paragraph('Padre'), { content: [paragraph('Hijo')], type: 'block_children' }],
          type: 'nested_block',
        },
        paragraph('Suelto'),
      ]),
    );

    const moved = moveBlock(state, { insertAt: state.doc.content.size, text: 'PadreHijo' });

    expect(blockTexts(moved)).toEqual(['Suelto', 'PadreHijo']);
    expect(moved.doc.child(1).type.name).toBe('nested_block');
  });

  it('moves blocks that hold no text, such as images', () => {
    const state = createState(asPageContent([{ attrs: { assetId: 'asset-1' }, type: 'image' }, paragraph('Debajo')]));
    const range = getPageEditorDragRange(state, 0);
    if (range === null) throw new Error('the image is not draggable');

    const moved = applyCommand(
      state,
      createPageEditorBlockMoveCommand({ copy: false, insertAt: state.doc.content.size, range }),
    );

    expect(moved.doc.children.map((node) => node.type.name)).toEqual(['paragraph', 'image']);
  });

  it('undoes the whole move in a single step', () => {
    const state = createState();

    const moved = moveBlock(state, { insertAt: state.doc.content.size, text: 'Primero' });
    const undone = applyCommand(moved, undo);

    expect(blockTexts(moved)).toEqual(['Segundo', 'Tercero', 'Primero']);
    expect(blockTexts(undone)).toEqual(['Primero', 'Segundo', 'Tercero']);
  });
});

describe('dropping a block inside another block', () => {
  it('drops the block inside a toggle', () => {
    const state = createState(
      asPageContent([
        { attrs: { summary: 'Plegable' }, content: [paragraph('Dentro')], type: 'toggle' },
        paragraph('Fuera'),
      ]),
    );
    const insertAt = resolvePageEditorDropPosition(state, {
      blockStart: findParagraphStart(state, 'Dentro'),
      placeAfter: true,
    });
    if (insertAt === null) throw new Error('the toggle child has no drop position');

    const moved = moveBlock(state, { insertAt, text: 'Fuera' });

    expect(moved.doc.childCount).toBe(1);
    expect(moved.doc.child(0).childCount).toBe(2);
    expect(moved.doc.child(0).child(1).textContent).toBe('Fuera');
  });

  it('drops the block inside a table cell', () => {
    const state = createState(
      asPageContent([
        {
          content: [{ content: [{ content: [paragraph('Celda')], type: 'table_cell' }], type: 'table_row' }],
          type: 'table',
        },
        paragraph('Fuera'),
      ]),
    );
    const insertAt = resolvePageEditorDropPosition(state, {
      blockStart: findParagraphStart(state, 'Celda'),
      placeAfter: true,
    });
    if (insertAt === null) throw new Error('the cell child has no drop position');

    const moved = moveBlock(state, { insertAt, text: 'Fuera' });

    expect(moved.doc.childCount).toBe(1);
    expect(moved.doc.child(0).child(0).child(0).textContent).toBe('CeldaFuera');
  });
});

describe('refusing a drop that would damage the page', () => {
  it('refuses to drop a block inside itself', () => {
    const state = createState();
    const range = getPageEditorDragRange(state, findBlockStart(state, 'Segundo'));
    if (range === null) throw new Error('the block is not draggable');

    const command = createPageEditorBlockMoveCommand({ copy: false, insertAt: range.from + 1, range });

    expect(command(state, undefined)).toBe(false);
  });

  it('refuses a drop that leaves the block exactly where it was', () => {
    const state = createState();
    const range = getPageEditorDragRange(state, findBlockStart(state, 'Segundo'));
    if (range === null) throw new Error('the block is not draggable');

    expect(createPageEditorBlockMoveCommand({ copy: false, insertAt: range.from, range })(state, undefined)).toBe(
      false,
    );
    expect(createPageEditorBlockMoveCommand({ copy: false, insertAt: range.to, range })(state, undefined)).toBe(false);
  });

  it('refuses a drop the page structure does not allow', () => {
    const state = createState(
      asPageContent([
        { content: [{ text: 'const value = 1;', type: 'text' }], type: 'code_block' },
        paragraph('Texto'),
      ]),
    );
    const range = getPageEditorDragRange(state, findBlockStart(state, 'Texto'));
    if (range === null) throw new Error('the paragraph is not draggable');

    const command = createPageEditorBlockMoveCommand({ copy: false, insertAt: 1, range });

    expect(command(state, undefined)).toBe(false);
  });

  it('leaves the page untouched when the drop is refused', () => {
    const state = createState();
    const before = state.doc.toJSON();
    const range = getPageEditorDragRange(state, findBlockStart(state, 'Segundo'));
    if (range === null) throw new Error('the block is not draggable');

    const after = applyCommand(state, createPageEditorBlockMoveCommand({ copy: false, insertAt: range.from, range }));

    expect(after.doc.toJSON()).toEqual(before);
  });
});

describe('copying a block instead of moving it', () => {
  it('leaves the original in place and adds the copy at the drop position', () => {
    const state = createState();

    const copied = moveBlock(state, { copy: true, insertAt: state.doc.content.size, text: 'Primero' });

    expect(blockTexts(copied)).toEqual(['Primero', 'Segundo', 'Tercero', 'Primero']);
  });

  it('accepts a copy dropped right where the original sits', () => {
    const state = createState();
    const range = getPageEditorDragRange(state, findBlockStart(state, 'Segundo'));
    if (range === null) throw new Error('the block is not draggable');

    expect(createPageEditorBlockMoveCommand({ copy: true, insertAt: range.from, range })(state, undefined)).toBe(true);
  });
});

describe('the drag affordances on screen', () => {
  const mountEditor = (): { readonly container: HTMLElement; readonly view: EditorView } => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView(container, { state: createState() });
    return { container, view };
  };

  const findIndicator = (container: HTMLElement): Element | null =>
    container.querySelector(`.${PAGE_EDITOR_DROP_INDICATOR_CLASS}`);

  it('arms the drag when the gutter handle is pressed', () => {
    const { container, view } = mountEditor();

    view.dispatch(view.state.tr.setMeta(pageEditorBlockHandleKey, 0));
    container
      .querySelector(`.${PAGE_EDITOR_BLOCK_HANDLE_CLASS}`)
      ?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(pageEditorBlockDragKey.getState(view.state)?.range).toEqual({ from: 0, to: 9 });
    expect(view.state.doc.textContent).toBe('PrimeroSegundoTercero');

    view.destroy();
    container.remove();
  });

  it('keeps the drag idle until the handle is pressed', () => {
    const { container, view } = mountEditor();

    view.dispatch(view.state.tr.setMeta(pageEditorBlockHandleKey, 0));

    expect(pageEditorBlockDragKey.getState(view.state)?.range).toBeNull();

    view.destroy();
    container.remove();
  });

  it('shows no drop line while nothing is being dragged', () => {
    const { container, view } = mountEditor();

    expect(findIndicator(container)).toBeNull();

    view.destroy();
    container.remove();
  });

  it('shows the drop line where the blocks would land', () => {
    const { container, view } = mountEditor();

    view.dispatch(
      view.state.tr.setMeta(pageEditorBlockDragKey, {
        placement: { insertAt: 9, kind: 'between' },
        range: { from: 0, to: 9 },
      }),
    );

    expect(findIndicator(container)).not.toBeNull();
    expect(view.state.doc.textContent).toBe('PrimeroSegundoTercero');

    view.destroy();
    container.remove();
  });

  it('cancels the drag when the page changes underneath it', () => {
    const { container, view } = mountEditor();

    view.dispatch(
      view.state.tr.setMeta(pageEditorBlockDragKey, {
        placement: { insertAt: 9, kind: 'between' },
        range: { from: 0, to: 9 },
      }),
    );
    view.dispatch(view.state.tr.insertText('!', 3));

    expect(pageEditorBlockDragKey.getState(view.state)?.range).toBeNull();
    expect(findIndicator(container)).toBeNull();

    view.destroy();
    container.remove();
  });

  it('takes the drop line away once the drag is over', () => {
    const { container, view } = mountEditor();

    view.dispatch(
      view.state.tr.setMeta(pageEditorBlockDragKey, {
        placement: { insertAt: 9, kind: 'between' },
        range: { from: 0, to: 9 },
      }),
    );
    view.dispatch(view.state.tr.setMeta(pageEditorBlockDragKey, { placement: null, range: null }));

    expect(findIndicator(container)).toBeNull();

    view.destroy();
    container.remove();
  });
});

describe('the copy that travels with the pointer', () => {
  it('carries what is being dragged, so it is the content that visibly moves', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView(container, { state: createState() });

    const ghost = createPageEditorDragGhost(view, { from: 0, to: 9 });
    ghost?.moveTo(120, 200);

    const rendered = document.body.querySelector('[aria-hidden="true"]');
    expect(rendered?.textContent).toBe('Primero');
    expect(view.state.doc.textContent).toBe('PrimeroSegundoTercero');

    ghost?.remove();
    expect(document.body.querySelector('[aria-hidden="true"]')).toBeNull();

    view.destroy();
    container.remove();
  });

  it('carries every block when several travel together', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView(container, { state: createState() });

    const ghost = createPageEditorDragGhost(view, { from: 0, to: 18 });

    expect(document.body.querySelector('[aria-hidden="true"]')?.textContent).toBe('PrimeroSegundo');

    ghost?.remove();
    view.destroy();
    container.remove();
  });
});

describe('reading a pointer that carries no position', () => {
  it('reports no block instead of asking the page about a coordinate that is not a number', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView(container, { state: createState() });

    expect(findPageEditorBlockAtPointer(view, { clientX: Number.NaN, clientY: 10 })).toBeNull();
    expect(findPageEditorBlockAtPointer(view, { clientX: 10, clientY: Number.NaN })).toBeNull();

    view.destroy();
    container.remove();
  });
});

describe('scrolling the page while dragging near an edge', () => {
  it('scrolls up when the pointer reaches the top edge', () => {
    expect(computePageEditorAutoScrollStep({ clientY: 10, viewportHeight: 800 })).toBeLessThan(0);
  });

  it('scrolls down when the pointer reaches the bottom edge', () => {
    expect(computePageEditorAutoScrollStep({ clientY: 790, viewportHeight: 800 })).toBeGreaterThan(0);
  });

  it('stays still while the pointer is away from both edges', () => {
    expect(computePageEditorAutoScrollStep({ clientY: 400, viewportHeight: 800 })).toBe(0);
  });
});
