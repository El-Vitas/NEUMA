import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { type EditorState, TextSelection } from 'prosemirror-state';
import {
  indentPageEditorBlock,
  outdentPageEditorBlock,
  splitOutOfNestedBlock,
} from '@/modules/pages/editor/blocks/lib/pages.editor.nesting.lib';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({
  content: [{ text, type: 'text' }],
  type: 'paragraph',
});

const twoParagraphs: PageContent = {
  content: [paragraph('Padre'), paragraph('Hijo')],
  schemaVersion: 1,
  type: 'doc',
};

const stateWithCursorInside = (content: PageContent, text: string): EditorState => {
  const state = createPageEditorState(content, 'Select block');
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

describe('indenting a block', () => {
  it('nests a paragraph under the paragraph above it', () => {
    const state = stateWithCursorInside(twoParagraphs, 'Hijo');

    const nested = applyCommand(state, indentPageEditorBlock);

    expect(nested.doc.childCount).toBe(1);
    expect(nested.doc.firstChild?.type.name).toBe('nested_block');
    expect(nested.doc.firstChild?.firstChild?.textContent).toBe('Padre');
    expect(nested.doc.firstChild?.lastChild?.type.name).toBe('block_children');
    expect(nested.doc.firstChild?.lastChild?.firstChild?.textContent).toBe('Hijo');
  });

  it('nests a heading just as it nests a paragraph', () => {
    const content: PageContent = {
      content: [paragraph('Padre'), { attrs: { level: 2 }, content: [{ text: 'Sub', type: 'text' }], type: 'heading' }],
      schemaVersion: 1,
      type: 'doc',
    };

    const nested = applyCommand(stateWithCursorInside(content, 'Sub'), indentPageEditorBlock);

    expect(nested.doc.firstChild?.type.name).toBe('nested_block');
    expect(nested.doc.firstChild?.lastChild?.firstChild?.type.name).toBe('heading');
  });

  it('adds a second child to a parent that already has children', () => {
    const state = stateWithCursorInside(
      { content: [paragraph('Padre'), paragraph('Uno'), paragraph('Dos')], schemaVersion: 1, type: 'doc' },
      'Uno',
    );
    const withFirstChild = applyCommand(state, indentPageEditorBlock);

    const withSecondChild = applyCommand(
      withFirstChild.apply(
        withFirstChild.tr.setSelection(TextSelection.create(withFirstChild.doc, withFirstChild.doc.content.size - 2)),
      ),
      indentPageEditorBlock,
    );

    expect(withSecondChild.doc.childCount).toBe(1);
    expect(withSecondChild.doc.firstChild?.lastChild?.childCount).toBe(2);
  });

  it('refuses to indent the first block, which has nothing to hang from', () => {
    const state = stateWithCursorInside(twoParagraphs, 'Padre');

    expect(indentPageEditorBlock(state, undefined)).toBe(false);
  });

  it('keeps the text of both blocks intact', () => {
    const nested = applyCommand(stateWithCursorInside(twoParagraphs, 'Hijo'), indentPageEditorBlock);

    expect(nested.doc.textContent).toBe('PadreHijo');
  });
});

describe('outdenting a block', () => {
  it('lifts a nested block back out to its parent level', () => {
    const nested = applyCommand(stateWithCursorInside(twoParagraphs, 'Hijo'), indentPageEditorBlock);
    let cursor = 0;
    nested.doc.descendants((node, position) => {
      if (node.isText && node.text === 'Hijo') cursor = position + 1;
    });

    const lifted = applyCommand(
      nested.apply(nested.tr.setSelection(TextSelection.create(nested.doc, cursor))),
      outdentPageEditorBlock,
    );

    expect(lifted.doc.textContent).toBe('PadreHijo');
    expect(lifted.doc.lastChild?.type.name).toBe('paragraph');
  });

  it('refuses to outdent a block that is not nested', () => {
    const state = stateWithCursorInside(twoParagraphs, 'Hijo');

    expect(outdentPageEditorBlock(state, undefined)).toBe(false);
  });
});

describe('pressing enter on a block that has children', () => {
  const nestedState = (): EditorState => {
    const state = stateWithCursorInside(twoParagraphs, 'Hijo');
    const nested = applyCommand(state, indentPageEditorBlock);
    let cursor = 0;
    nested.doc.descendants((node, position) => {
      if (node.isText && node.text === 'Padre') cursor = position + node.nodeSize;
    });
    return nested.apply(nested.tr.setSelection(TextSelection.create(nested.doc, cursor)));
  };

  it('adds the new paragraph as a sibling, not as another child', () => {
    const afterEnter = applyCommand(nestedState(), splitOutOfNestedBlock);

    expect(afterEnter.doc.childCount).toBe(2);
    expect(afterEnter.doc.lastChild?.type.name).toBe('paragraph');
    expect(afterEnter.doc.firstChild?.lastChild?.childCount).toBe(1);
  });

  it('leaves the existing children untouched', () => {
    const afterEnter = applyCommand(nestedState(), splitOutOfNestedBlock);

    expect(afterEnter.doc.firstChild?.lastChild?.firstChild?.textContent).toBe('Hijo');
  });

  it('does not interfere when the cursor sits in a plain block', () => {
    const state = stateWithCursorInside(twoParagraphs, 'Hijo');

    expect(splitOutOfNestedBlock(state, undefined)).toBe(false);
  });
});
