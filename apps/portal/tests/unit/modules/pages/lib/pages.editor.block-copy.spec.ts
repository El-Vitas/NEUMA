import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { closeHistory, undo } from 'prosemirror-history';
import type { Command, EditorState } from 'prosemirror-state';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { duplicatePageEditorBlock } from '@/modules/pages/editor/blocks/lib/pages.editor.block-copy.lib';
import { deletePageEditorBlocks } from '@/modules/pages/editor/blocks/lib/pages.editor.block-delete.lib';
import { indentPageEditorBlock } from '@/modules/pages/editor/blocks/lib/pages.editor.nesting.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

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

const selectBlockAt = (state: EditorState, blockIndex: number): EditorState => {
  let blockStart = 0;
  for (let index = 0; index < blockIndex; index += 1) blockStart += state.doc.child(index).nodeSize;
  return state.apply(state.tr.setSelection(NodeSelection.create(state.doc, blockStart)));
};

/** Starts a new change, so undoing reverts only what comes next. */
const startNewChange = (state: EditorState): EditorState => state.apply(closeHistory(state.tr));

const describeBlocks = (state: EditorState): unknown =>
  state.doc.children.map((block) => ({ text: block.textContent, type: block.type.name }));

const readBlockIds = (state: EditorState): readonly string[] => {
  const ids: string[] = [];
  state.doc.descendants((node) => {
    if (typeof node.attrs.id === 'string') ids.push(node.attrs.id);
  });
  return ids;
};

describe('duplicating a block', () => {
  it('leaves the copy right below the original', () => {
    const state = putCursorIn(createState([paragraph('Uno'), paragraph('Dos')]), 'Uno');

    const duplicated = applyCommand(state, duplicatePageEditorBlock);

    expect(describeBlocks(duplicated)).toEqual([
      { text: 'Uno', type: 'paragraph' },
      { text: 'Uno', type: 'paragraph' },
      { text: 'Dos', type: 'paragraph' },
    ]);
  });

  it('duplicates a block that has nothing to write in, such as an image', () => {
    const state = selectBlockAt(createState([{ attrs: { assetId: 'asset-1' }, type: 'image' }]), 0);

    const duplicated = applyCommand(state, duplicatePageEditorBlock);

    expect(duplicated.doc.children.map((block) => block.type.name)).toEqual(['image', 'image']);
  });

  it('takes the blocks hanging from it along with it', () => {
    const nested = applyCommand(
      putCursorIn(createState([paragraph('Padre'), paragraph('Hijo')]), 'Hijo'),
      indentPageEditorBlock,
    );

    const duplicated = applyCommand(putCursorIn(nested, 'Padre'), duplicatePageEditorBlock);

    expect(duplicated.doc.childCount).toBe(2);
    expect(duplicated.doc.children.map((block) => block.type.name)).toEqual(['nested_block', 'nested_block']);
    expect(duplicated.doc.child(1).lastChild?.child(0).textContent).toBe('Hijo');
  });

  it('duplicates every block the selection covers, in order', () => {
    const state = selectFromTo(createState([paragraph('Uno'), paragraph('Dos'), paragraph('Tres')]), 'Uno', 'Dos');

    const duplicated = applyCommand(state, duplicatePageEditorBlock);

    expect(describeBlocks(duplicated)).toEqual([
      { text: 'Uno', type: 'paragraph' },
      { text: 'Dos', type: 'paragraph' },
      { text: 'Uno', type: 'paragraph' },
      { text: 'Dos', type: 'paragraph' },
      { text: 'Tres', type: 'paragraph' },
    ]);
  });

  it('gives the copy an identity of its own, so a link to one never opens the other', () => {
    const state = putCursorIn(createState([paragraph('Uno')]), 'Uno');

    const duplicated = applyCommand(state, duplicatePageEditorBlock);
    const ids = readBlockIds(duplicated);

    expect(ids.length).toBe(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('is undone in one step', () => {
    const state = putCursorIn(createState([paragraph('Uno')]), 'Uno');
    const duplicated = applyCommand(state, duplicatePageEditorBlock);

    expect(describeBlocks(applyCommand(duplicated, undo))).toEqual([{ text: 'Uno', type: 'paragraph' }]);
  });
});

describe('deleting a block', () => {
  it('removes the block the cursor is in and leaves the rest alone', () => {
    const state = putCursorIn(createState([paragraph('Uno'), paragraph('Dos')]), 'Uno');

    const deleted = applyCommand(state, deletePageEditorBlocks);

    expect(describeBlocks(deleted)).toEqual([{ text: 'Dos', type: 'paragraph' }]);
  });

  it('removes every block the selection covers', () => {
    const state = selectFromTo(createState([paragraph('Uno'), paragraph('Dos'), paragraph('Tres')]), 'Uno', 'Dos');

    const deleted = applyCommand(state, deletePageEditorBlocks);

    expect(describeBlocks(deleted)).toEqual([{ text: 'Tres', type: 'paragraph' }]);
  });

  it('leaves a page that can still be written in when the last block goes', () => {
    const state = selectBlockAt(createState([paragraph('Uno')]), 0);

    const deleted = applyCommand(state, deletePageEditorBlocks);

    expect(describeBlocks(deleted)).toEqual([{ text: '', type: 'paragraph' }]);
    expect(() => serializePageEditorState(deleted)).not.toThrow();
  });

  it('brings the block back intact when undone', () => {
    const nested = applyCommand(
      putCursorIn(createState([paragraph('Padre'), paragraph('Hijo')]), 'Hijo'),
      indentPageEditorBlock,
    );
    const deleted = applyCommand(startNewChange(putCursorIn(nested, 'Padre')), deletePageEditorBlocks);

    const restored = applyCommand(deleted, undo);

    expect(deleted.doc.childCount).toBe(1);
    expect(restored.doc.child(0).type.name).toBe('nested_block');
    expect(restored.doc.child(0).lastChild?.child(0).textContent).toBe('Hijo');
  });
});
