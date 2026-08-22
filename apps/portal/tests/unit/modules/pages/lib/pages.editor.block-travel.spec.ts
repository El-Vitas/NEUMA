import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { readSelectedPageBlocksContent } from '@/modules/pages/editor/blocks/lib/pages.editor.block-travel.lib';
import { indentPageEditorBlock } from '@/modules/pages/editor/blocks/lib/pages.editor.nesting.lib';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const createState = (content: PageContentNode[]): EditorState =>
  createPageEditorState({ content, schemaVersion: 1, type: 'doc' } as PageContent, 'Select block');

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

describe('taking blocks to another page', () => {
  it('reads the selected blocks as content a page can hold', () => {
    const state = selectFromTo(createState([paragraph('Uno'), paragraph('Dos'), paragraph('Tres')]), 'Uno', 'Dos');

    expect(readSelectedPageBlocksContent(state)).toEqual({
      content: [paragraph('Uno'), paragraph('Dos')],
      schemaVersion: 1,
      type: 'doc',
    });
  });

  it('takes what hangs from a block along with it', () => {
    const nested = applyCommand(
      putCursorIn(createState([paragraph('Padre'), paragraph('Hijo')]), 'Hijo'),
      indentPageEditorBlock,
    );

    const travelling = readSelectedPageBlocksContent(putCursorIn(nested, 'Padre'));

    expect(travelling?.content.length).toBe(1);
    expect(travelling?.content[0]?.type).toBe('nested_block');
  });

  it('reads a block with nothing to write in, such as an image', () => {
    const state = createState([{ attrs: { assetId: 'asset-1' }, type: 'image' }]);
    const selected = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)));

    expect(readSelectedPageBlocksContent(selected)?.content[0]?.type).toBe('image');
  });
});
