import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@neuma/shared';
import type { Command, EditorState } from 'prosemirror-state';
import {
  createPageEditorCommentMarkCommand,
  createPageEditorCommentUnmarkCommand,
  createPageEditorOpenDiscussionsCommand,
  readPageEditorFragmentText,
  readPageEditorRequestedBlockId,
} from '@/modules/pages/editor/blocks/lib/pages.editor.block-comment.lib';
import { readPageEditorBlockRequest } from '@/modules/pages/editor/blocks/lib/pages.editor.block-menu.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const BLOCK = '11111111-1111-4111-8111-111111111111';
const OTHER_BLOCK = '22222222-2222-4222-8222-222222222222';
const DISCUSSION = '33333333-3333-4333-8333-333333333333';

const paragraph = (id: string, text: string): PageContentNode => ({
  attrs: { id },
  content: [{ text, type: 'text' }],
  type: 'paragraph',
});

const createState = (content: PageContentNode[]): EditorState =>
  createPageEditorState({ content, schemaVersion: 1, type: 'doc' } as PageContent, 'Select block');

const applyCommand = (state: EditorState, command: Command): EditorState => {
  let next = state;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

const readCommentedText = (state: EditorState): readonly { readonly id: string; readonly text: string }[] => {
  const commented: { id: string; text: string }[] = [];
  state.doc.descendants((node) => {
    const mark = node.marks.find((candidate) => candidate.type.name === 'comment');
    if (node.isText && mark !== undefined && typeof node.text === 'string') {
      commented.push({ id: String(mark.attrs.id), text: node.text });
    }
  });
  return commented;
};

describe('marking the words of a discussion', () => {
  it('gives the chosen words the id of their discussion', () => {
    const state = createState([paragraph(BLOCK, 'Una frase larga')]);

    const marked = applyCommand(state, createPageEditorCommentMarkCommand(DISCUSSION, { from: 5, to: 10 }));

    expect(readCommentedText(marked)).toEqual([{ id: DISCUSSION, text: 'frase' }]);
  });

  it('refuses a stretch that holds no words', () => {
    const state = createState([paragraph(BLOCK, 'Una frase larga')]);

    expect(createPageEditorCommentMarkCommand(DISCUSSION, { from: 6, to: 6 })(state)).toBe(false);
  });

  it('keeps the mark when the page is saved and opened again', () => {
    const state = createState([paragraph(BLOCK, 'Una frase larga')]);
    const marked = applyCommand(state, createPageEditorCommentMarkCommand(DISCUSSION, { from: 5, to: 10 }));

    const reopened = createPageEditorState(serializePageEditorState(marked), 'Select block');

    expect(readCommentedText(reopened)).toEqual([{ id: DISCUSSION, text: 'frase' }]);
  });

  it('takes the mark off every stretch that carries it', () => {
    const state = createState([paragraph(BLOCK, 'Una frase larga'), paragraph(OTHER_BLOCK, 'otra')]);
    const marked = applyCommand(state, createPageEditorCommentMarkCommand(DISCUSSION, { from: 5, to: 10 }));

    const cleared = applyCommand(marked, createPageEditorCommentUnmarkCommand(DISCUSSION));

    expect(readCommentedText(cleared)).toEqual([]);
    expect(() => serializePageEditorState(cleared)).not.toThrow();
  });
});

describe('reading what a request is about', () => {
  it('reads the words chosen', () => {
    const state = createState([paragraph(BLOCK, 'Una frase larga')]);

    expect(readPageEditorFragmentText(state, { from: 5, to: 10 })).toBe('frase');
  });

  it('reads the id of the block that starts where the request says', () => {
    const state = createState([paragraph(BLOCK, 'Uno'), paragraph(OTHER_BLOCK, 'Dos')]);
    const secondStart = state.doc.child(0).nodeSize;

    expect(readPageEditorRequestedBlockId(state, 0)).toBe(BLOCK);
    expect(readPageEditorRequestedBlockId(state, secondStart)).toBe(OTHER_BLOCK);
  });
});

describe('opening the discussions of a block by its id', () => {
  it('asks for the block wherever it stands, naming the discussion to show first', () => {
    const state = createState([paragraph(BLOCK, 'Uno'), paragraph(OTHER_BLOCK, 'Dos')]);

    const asked = applyCommand(state, createPageEditorOpenDiscussionsCommand(OTHER_BLOCK, DISCUSSION));

    expect(readPageEditorBlockRequest(asked)).toEqual({
      blockStart: state.doc.child(0).nodeSize,
      discussionId: DISCUSSION,
      kind: 'comments',
    });
  });

  it('does nothing for a block that is not on the page', () => {
    const state = createState([paragraph(BLOCK, 'Uno')]);

    expect(createPageEditorOpenDiscussionsCommand(OTHER_BLOCK, null)(state)).toBe(false);
  });
});
