import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { undo } from 'prosemirror-history';
import type { Command, EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import {
  createPageEditorBlockColorCommand,
  readPageEditorBlockColor,
} from '@/modules/pages/editor/blocks/lib/pages.editor.block-color.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

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

const readColors = (state: EditorState): unknown =>
  state.doc.children.map((block) => ({
    background: block.attrs.backgroundColor,
    text: block.attrs.textColor,
  }));

describe('painting a block', () => {
  it('colours its text', () => {
    const state = putCursorIn(createState([paragraph('Aviso')]), 'Aviso');

    const painted = applyCommand(state, createPageEditorBlockColorCommand('text', 'red'));

    expect(readColors(painted)).toEqual([{ background: null, text: 'red' }]);
  });

  it('colours its background without touching the text colour', () => {
    const state = putCursorIn(createState([paragraph('Aviso')]), 'Aviso');
    const withText = applyCommand(state, createPageEditorBlockColorCommand('text', 'red'));

    const painted = applyCommand(
      putCursorIn(withText, 'Aviso'),
      createPageEditorBlockColorCommand('background', 'yellow'),
    );

    expect(readColors(painted)).toEqual([{ background: 'yellow', text: 'red' }]);
  });

  it('takes the colour off and goes back to the page default', () => {
    const state = putCursorIn(createState([paragraph('Aviso')]), 'Aviso');
    const painted = applyCommand(state, createPageEditorBlockColorCommand('text', 'blue'));

    const cleared = applyCommand(putCursorIn(painted, 'Aviso'), createPageEditorBlockColorCommand('text', null));

    expect(readColors(cleared)).toEqual([{ background: null, text: null }]);
  });

  it('paints every block the selection covers', () => {
    const state = selectFromTo(createState([paragraph('Uno'), paragraph('Dos'), paragraph('Tres')]), 'Uno', 'Dos');

    const painted = applyCommand(state, createPageEditorBlockColorCommand('background', 'green'));

    expect(readColors(painted)).toEqual([
      { background: 'green', text: null },
      { background: 'green', text: null },
      { background: null, text: null },
    ]);
  });

  it('says which colour the block is wearing', () => {
    const state = putCursorIn(createState([paragraph('Aviso')]), 'Aviso');
    const painted = applyCommand(state, createPageEditorBlockColorCommand('text', 'purple'));

    expect(readPageEditorBlockColor(putCursorIn(painted, 'Aviso'), 'text')).toBe('purple');
    expect(readPageEditorBlockColor(putCursorIn(painted, 'Aviso'), 'background')).toBeNull();
  });

  it('keeps the colour when the page is saved and opened again', () => {
    const state = putCursorIn(createState([paragraph('Aviso')]), 'Aviso');
    const painted = applyCommand(state, createPageEditorBlockColorCommand('background', 'blue'));

    const reopened = createPageEditorState(serializePageEditorState(painted), 'Select block');

    expect(readColors(reopened)).toEqual([{ background: 'blue', text: null }]);
  });

  it('is undone in one step', () => {
    const state = putCursorIn(createState([paragraph('Aviso')]), 'Aviso');
    const painted = applyCommand(state, createPageEditorBlockColorCommand('text', 'red'));

    expect(readColors(applyCommand(painted, undo))).toEqual([{ background: null, text: null }]);
  });
});
