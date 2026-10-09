import { describe, expect, it } from 'bun:test';
import type { Command, EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import {
  nestPageEditorListItem,
  unnestPageEditorListItem,
} from '@/modules/pages/editor/structure/lib/pages.editor.list.lib';
import type { PageContent } from '@/modules/pages/types/pages.types';

const point = (text: string): Record<string, unknown> => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  type: 'list_item',
});

const listOfTwoPoints: PageContent = {
  content: [{ content: [point('Primero'), point('Segundo')], type: 'bullet_list' }],
  schemaVersion: 1,
  type: 'doc',
} as PageContent;

const task = (text: string): Record<string, unknown> => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  type: 'task_item',
});

const listOfTwoTasks: PageContent = {
  content: [{ content: [task('Pagar la cuenta'), task('Guardar el vuelto')], type: 'task_list' }],
  schemaVersion: 1,
  type: 'doc',
} as PageContent;

const oneParagraph: PageContent = {
  content: [{ content: [{ text: 'Suelto', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
} as PageContent;

const withCursorAtTheEnd = (content: PageContent): EditorState => {
  const state = createPageEditorState(content, 'Select block');
  return state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(state.doc.content.size), -1)));
};

const press = (command: Command, content: PageContent = listOfTwoPoints): EditorState | null => {
  const state = withCursorAtTheEnd(content);
  let next: EditorState | null = null;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

const readPoints = (state: EditorState): number => state.doc.firstChild?.childCount ?? 0;

const readNestedPoints = (state: EditorState, listType = 'bullet_list'): number => {
  const firstPoint = state.doc.firstChild?.firstChild;
  const nestedList = firstPoint?.lastChild;
  return nestedList?.type.name === listType ? nestedList.childCount : 0;
};

describe('Tab on a point of a list', () => {
  it('hangs the point from the one above it', () => {
    const next = press(nestPageEditorListItem);
    if (next === null) throw new Error('Tab left the list untouched');

    expect(readPoints(next)).toBe(1);
    expect(readNestedPoints(next)).toBe(1);
  });

  it('hangs a task from the task above it too', () => {
    const next = press(nestPageEditorListItem, listOfTwoTasks);
    if (next === null) throw new Error('Tab left the tasks untouched');

    expect(readPoints(next)).toBe(1);
    expect(readNestedPoints(next, 'task_list')).toBe(1);
  });

  it('says nothing outside a list, so the general nesting answers instead', () => {
    expect(press(nestPageEditorListItem, oneParagraph)).toBeNull();
  });
});

describe('Shift+Tab on a nested point', () => {
  it('returns it to the level of the point it hung from', () => {
    const nested = press(nestPageEditorListItem);
    if (nested === null) throw new Error('Tab left the list untouched');

    let next: EditorState | null = null;
    unnestPageEditorListItem(nested, (transaction) => {
      next = nested.apply(transaction);
    });
    if (next === null) throw new Error('Shift+Tab left the list untouched');

    expect(readPoints(next)).toBe(2);
    expect(readNestedPoints(next)).toBe(0);
  });

  it('says nothing outside a list, so the general nesting answers instead', () => {
    expect(press(unnestPageEditorListItem, oneParagraph)).toBeNull();
  });
});
