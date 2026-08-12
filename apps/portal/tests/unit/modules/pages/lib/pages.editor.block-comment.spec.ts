import { describe, expect, it } from 'bun:test';
import type { PageBlockComment, PageContent, PageContentNode } from '@company-brain/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import {
  createPageEditorBlockCommentCommand,
  createPageEditorBlockCommentRemovalCommand,
  readPageEditorBlockComments,
} from '@/modules/pages/lib/pages.editor.block-comment.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';

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

const putCursorIn = (state: EditorState, text: string): EditorState => {
  let position: number | null = null;
  state.doc.descendants((node, nodePosition) => {
    if (node.isText && node.text === text) position = nodePosition;
  });
  if (position === null) throw new Error(`text "${text}" not found`);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, position + 1)));
};

const remark = (id: string, body: string): PageBlockComment => ({
  author: 'Admin User',
  body,
  createdAt: '2026-08-12T10:00:00.000Z',
  id,
});

describe('commenting a block', () => {
  it('keeps what was said with the block itself', () => {
    const state = putCursorIn(createState([paragraph('Presupuesto')]), 'Presupuesto');

    const commented = applyCommand(state, createPageEditorBlockCommentCommand(remark('c1', 'Falta el detalle')));

    expect(readPageEditorBlockComments(putCursorIn(commented, 'Presupuesto'))).toEqual([
      remark('c1', 'Falta el detalle'),
    ]);
  });

  it('adds each remark after the ones before it', () => {
    const first = applyCommand(
      putCursorIn(createState([paragraph('Presupuesto')]), 'Presupuesto'),
      createPageEditorBlockCommentCommand(remark('c1', 'Falta el detalle')),
    );

    const second = applyCommand(
      putCursorIn(first, 'Presupuesto'),
      createPageEditorBlockCommentCommand(remark('c2', 'Ya está')),
    );

    expect(readPageEditorBlockComments(putCursorIn(second, 'Presupuesto')).map((comment) => comment.body)).toEqual([
      'Falta el detalle',
      'Ya está',
    ]);
  });

  it('refuses a remark that says nothing', () => {
    const state = putCursorIn(createState([paragraph('Presupuesto')]), 'Presupuesto');

    expect(createPageEditorBlockCommentCommand(remark('c1', '   '))(state)).toBe(false);
  });

  it('marks the block as commented, so it can be told apart', () => {
    const state = putCursorIn(createState([paragraph('Presupuesto')]), 'Presupuesto');

    const commented = applyCommand(state, createPageEditorBlockCommentCommand(remark('c1', 'Revisar')));

    expect(commented.doc.child(0).type.spec.toDOM?.(commented.doc.child(0))).toBeDefined();
    expect(readPageEditorBlockComments(putCursorIn(commented, 'Presupuesto')).length).toBe(1);
  });

  it('survives saving the page and opening it again', () => {
    const state = putCursorIn(createState([paragraph('Presupuesto')]), 'Presupuesto');
    const commented = applyCommand(state, createPageEditorBlockCommentCommand(remark('c1', 'Revisar')));

    const reopened = createPageEditorState(serializePageEditorState(commented), 'Select block');

    expect(readPageEditorBlockComments(putCursorIn(reopened, 'Presupuesto')).map((comment) => comment.body)).toEqual([
      'Revisar',
    ]);
  });

  it('lets a remark be taken back', () => {
    const commented = applyCommand(
      putCursorIn(createState([paragraph('Presupuesto')]), 'Presupuesto'),
      createPageEditorBlockCommentCommand(remark('c1', 'Revisar')),
    );

    const cleared = applyCommand(
      putCursorIn(commented, 'Presupuesto'),
      createPageEditorBlockCommentRemovalCommand('c1'),
    );

    expect(readPageEditorBlockComments(putCursorIn(cleared, 'Presupuesto'))).toEqual([]);
    expect(() => serializePageEditorState(cleared)).not.toThrow();
  });
});
