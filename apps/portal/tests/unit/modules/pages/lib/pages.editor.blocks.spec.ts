import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@neuma/shared';
import type { EditorState } from 'prosemirror-state';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import {
  indentPageEditorBlock,
  outdentPageEditorBlock,
} from '@/modules/pages/editor/blocks/lib/pages.editor.nesting.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const threeBlocks: PageContent = {
  content: [
    paragraph('Primero'),
    { attrs: { level: 2 }, content: [{ text: 'Segundo', type: 'text' }], type: 'heading' },
    paragraph('Tercero'),
  ],
  schemaVersion: 1,
  type: 'doc',
};

const stateOf = (content: PageContent): EditorState => createPageEditorState(content, 'Select block');

const cursorInside = (state: EditorState, text: string): EditorState => {
  let cursor: number | null = null;
  state.doc.descendants((node, position) => {
    if (node.isText && node.text === text) cursor = position + 1;
  });
  if (cursor === null) throw new Error(`text "${text}" not found`);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, cursor)));
};

const applyCommand = (state: EditorState, command: typeof indentPageEditorBlock): EditorState => {
  let next = state;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

describe('BL-01 · cada pieza de contenido es un bloque independiente', () => {
  it('guarda cada pieza como un nodo propio con su tipo', () => {
    const state = stateOf(threeBlocks);

    const types: string[] = [];
    state.doc.forEach((node) => {
      types.push(node.type.name);
    });

    expect(types).toEqual(['paragraph', 'heading', 'paragraph']);
  });

  it('editar un bloque no altera a sus vecinos', () => {
    const state = cursorInside(stateOf(threeBlocks), 'Segundo');

    const edited = state.apply(state.tr.insertText('!'));

    expect(edited.doc.child(0).textContent).toBe('Primero');
    expect(edited.doc.child(2).textContent).toBe('Tercero');
    expect(edited.doc.child(1).textContent).not.toBe('Segundo');
  });
});

describe('BL-01 · un bloque se puede señalar y actuar sobre él sin tocar los de al lado', () => {
  it('permite seleccionar un bloque entero por su posición', () => {
    const state = stateOf(threeBlocks);
    const secondBlockPosition = state.doc.child(0).nodeSize;

    const selected = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, secondBlockPosition)));

    expect(selected.selection).toBeInstanceOf(NodeSelection);
    expect((selected.selection as NodeSelection).node.textContent).toBe('Segundo');
  });

  it('seleccionar un bloque deja el documento intacto', () => {
    const state = stateOf(threeBlocks);
    const before = state.doc.toJSON();

    const selected = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, state.doc.child(0).nodeSize)));

    expect(selected.doc.toJSON()).toEqual(before);
  });
});

describe('BL-01 · los bloques tienen un orden explícito que se conserva', () => {
  it('conserva el orden al guardar y volver a abrir el documento', () => {
    const state = stateOf(threeBlocks);

    const reopened = stateOf(serializePageEditorState(state));

    const texts: string[] = [];
    reopened.doc.forEach((node) => {
      texts.push(node.textContent);
    });
    expect(texts).toEqual(['Primero', 'Segundo', 'Tercero']);
  });

  it('mueve un bloque sin alterar el orden de los demás', () => {
    const state = stateOf(threeBlocks);
    const first = state.doc.child(0);
    const transaction = state.tr.delete(0, first.nodeSize).insert(state.doc.content.size - first.nodeSize, first);

    const moved = state.apply(transaction);

    const texts: string[] = [];
    moved.doc.forEach((node) => {
      texts.push(node.textContent);
    });
    expect(texts).toEqual(['Segundo', 'Tercero', 'Primero']);
  });
});

describe('BL-01 · un bloque puede contener otros bloques', () => {
  it('cuelga un párrafo de otro párrafo', () => {
    const nested = applyCommand(cursorInside(stateOf(threeBlocks), 'Tercero'), indentPageEditorBlock);

    expect(nested.doc.lastChild?.type.name).toBe('nested_block');
    expect(nested.doc.lastChild?.firstChild?.textContent).toBe('Segundo');
    expect(nested.doc.lastChild?.lastChild?.firstChild?.textContent).toBe('Tercero');
  });

  it('devuelve el bloque a su nivel original', () => {
    const nested = applyCommand(cursorInside(stateOf(threeBlocks), 'Tercero'), indentPageEditorBlock);

    const lifted = applyCommand(cursorInside(nested, 'Tercero'), outdentPageEditorBlock);

    const texts: string[] = [];
    lifted.doc.forEach((node) => {
      texts.push(node.textContent);
    });
    expect(texts).toEqual(['Primero', 'Segundo', 'Tercero']);
  });

  it('conserva la jerarquía al guardar y volver a abrir', () => {
    const nested = applyCommand(cursorInside(stateOf(threeBlocks), 'Tercero'), indentPageEditorBlock);

    const reopened = stateOf(serializePageEditorState(nested));

    expect(reopened.doc.lastChild?.type.name).toBe('nested_block');
    expect(reopened.doc.lastChild?.lastChild?.firstChild?.textContent).toBe('Tercero');
  });
});

describe('BL-01 · la página es un árbol de bloques, no texto con formato', () => {
  it('describe la página como nodos tipados y no como una cadena', () => {
    const serialized = serializePageEditorState(stateOf(threeBlocks));

    expect(serialized.type).toBe('doc');
    expect(Array.isArray(serialized.content)).toBe(true);
    expect(serialized.content.map((node) => node.type)).toEqual(['paragraph', 'heading', 'paragraph']);
  });

  it('anida los hijos dentro del árbol, no como hermanos con sangría', () => {
    const nested = applyCommand(cursorInside(stateOf(threeBlocks), 'Tercero'), indentPageEditorBlock);

    const serialized = serializePageEditorState(nested);
    const lastNode = serialized.content.at(-1);

    expect(lastNode?.type).toBe('nested_block');
    expect(serialized.content).toHaveLength(2);
  });
});
