import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import { indentPageEditorBlock, outdentPageEditorBlock } from '@/modules/pages/lib/pages.editor.nesting.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const asPageContent = (content: PageContentNode[]): PageContent => ({ content, schemaVersion: 1, type: 'doc' });

const createState = (content: PageContentNode[]): EditorState =>
  createPageEditorState(asPageContent(content), 'Select block');

const applyCommand = (state: EditorState, command: Command): EditorState => {
  let next = state;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

const findTextPosition = (state: EditorState, text: string): number => {
  let position: number | null = null;
  state.doc.descendants((node, nodePosition) => {
    if (node.isText && node.text === text) position = nodePosition;
  });
  if (position === null) throw new Error(`text "${text}" not found`);
  return position;
};

const putCursorIn = (state: EditorState, text: string): EditorState =>
  state.apply(state.tr.setSelection(TextSelection.create(state.doc, findTextPosition(state, text) + 1)));

const selectFromTo = (state: EditorState, fromText: string, toText: string): EditorState =>
  state.apply(
    state.tr.setSelection(
      TextSelection.create(state.doc, findTextPosition(state, fromText), findTextPosition(state, toText) + 1),
    ),
  );

const describeNesting = (state: EditorState): unknown =>
  state.doc.children.map((block) => ({
    holds: block.type.name === 'nested_block' ? block.lastChild?.children.map((child) => child.textContent) : undefined,
    text: block.type.name === 'nested_block' ? block.firstChild?.textContent : block.textContent,
    type: block.type.name,
  }));

describe('nesting blocks that are not lists', () => {
  it('nests a quote, a code block and a table just as it nests a paragraph', () => {
    const cases: readonly { readonly block: PageContentNode; readonly cursorText: string }[] = [
      { block: { content: [paragraph('Citado')], type: 'blockquote' }, cursorText: 'Citado' },
      {
        block: { content: [{ text: 'const total = 1;', type: 'text' }], type: 'code_block' },
        cursorText: 'const total = 1;',
      },
      {
        block: {
          content: [{ content: [{ content: [paragraph('Celda')], type: 'table_cell' }], type: 'table_row' }],
          type: 'table',
        },
        cursorText: 'Celda',
      },
    ];

    for (const { block, cursorText } of cases) {
      const state = createState([paragraph('Padre'), block]);
      const indented = applyCommand(putCursorIn(state, cursorText), indentPageEditorBlock);

      expect(indented.doc.childCount).toBe(1);
      expect(indented.doc.child(0).type.name).toBe('nested_block');
      expect(indented.doc.child(0).lastChild?.child(0).type.name).toBe(block.type);
    }
  });

  it('nests a collection, which is a block that shows a page of its own', () => {
    const state = createState([
      paragraph('Padre'),
      { attrs: { pageId: 'page-1', spaceId: 'space-1' }, type: 'collection' },
    ]);
    const collectionStart = state.doc.child(0).nodeSize;
    const withCollectionSelected = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, collectionStart)));

    const indented = applyCommand(withCollectionSelected, indentPageEditorBlock);

    expect(indented.doc.child(0).type.name).toBe('nested_block');
    expect(indented.doc.child(0).lastChild?.child(0).type.name).toBe('collection');
  });

  it('nests a block that holds nothing to put a cursor in, such as an image', () => {
    const state = createState([paragraph('Padre'), { attrs: { assetId: 'asset-1' }, type: 'image' }]);
    const imageStart = state.doc.child(0).nodeSize;
    const withImageSelected = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, imageStart)));

    const indented = applyCommand(withImageSelected, indentPageEditorBlock);

    expect(indented.doc.child(0).type.name).toBe('nested_block');
    expect(indented.doc.child(0).lastChild?.child(0).type.name).toBe('image');
  });
});

describe('nesting inside something already nested', () => {
  it('lets a nested block hold nested blocks of its own', () => {
    const state = createState([paragraph('Uno'), paragraph('Dos'), paragraph('Tres')]);

    const once = applyCommand(putCursorIn(state, 'Dos'), indentPageEditorBlock);
    const twice = applyCommand(putCursorIn(once, 'Tres'), indentPageEditorBlock);
    const thrice = applyCommand(putCursorIn(twice, 'Tres'), indentPageEditorBlock);

    const outerChildren = thrice.doc.child(0).lastChild;
    expect(thrice.doc.child(0).type.name).toBe('nested_block');
    expect(outerChildren?.child(0).type.name).toBe('nested_block');
    expect(outerChildren?.child(0).lastChild?.child(0).textContent).toBe('Tres');
  });

  it('takes a block back out one level at a time', () => {
    const state = createState([paragraph('Uno'), paragraph('Dos')]);
    const nested = applyCommand(putCursorIn(state, 'Dos'), indentPageEditorBlock);

    const lifted = applyCommand(putCursorIn(nested, 'Dos'), outdentPageEditorBlock);

    expect(describeNesting(lifted)).toEqual([
      { holds: undefined, text: 'Uno', type: 'paragraph' },
      { holds: undefined, text: 'Dos', type: 'paragraph' },
    ]);
  });
});

describe('nesting several blocks at once', () => {
  it('nests every block the selection covers', () => {
    const state = createState([paragraph('Padre'), paragraph('Uno'), paragraph('Dos')]);

    const indented = applyCommand(selectFromTo(state, 'Uno', 'Dos'), indentPageEditorBlock);

    expect(describeNesting(indented)).toEqual([{ holds: ['Uno', 'Dos'], text: 'Padre', type: 'nested_block' }]);
  });

  it('takes them all back out together', () => {
    const state = createState([paragraph('Padre'), paragraph('Uno'), paragraph('Dos')]);
    const indented = applyCommand(selectFromTo(state, 'Uno', 'Dos'), indentPageEditorBlock);

    const lifted = applyCommand(selectFromTo(indented, 'Uno', 'Dos'), outdentPageEditorBlock);

    expect(describeNesting(lifted)).toEqual([
      { holds: undefined, text: 'Padre', type: 'paragraph' },
      { holds: undefined, text: 'Uno', type: 'paragraph' },
      { holds: undefined, text: 'Dos', type: 'paragraph' },
    ]);
  });
});

describe('keeping what is nested', () => {
  it('survives being saved and opened again', () => {
    const state = createState([paragraph('Padre'), paragraph('Hijo')]);
    const indented = applyCommand(putCursorIn(state, 'Hijo'), indentPageEditorBlock);

    const reopened = createPageEditorState(serializePageEditorState(indented), 'Select block');

    expect(describeNesting(reopened)).toEqual([{ holds: ['Hijo'], text: 'Padre', type: 'nested_block' }]);
  });
});
