import { describe, expect, it } from 'bun:test';
import { baseKeymap } from 'prosemirror-commands';
import { splitListItem } from 'prosemirror-schema-list';
import type { Command, EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';
import type { PageContent } from '@/modules/pages/types/pages.types';

const listOfOnePoint: PageContent = {
  content: [
    {
      content: [{ content: [{ content: [{ text: 'Primero', type: 'text' }], type: 'paragraph' }], type: 'list_item' }],
      type: 'bullet_list',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
} as PageContent;

/** The cursor left where a reader leaves it: at the end of the point just written. */
const withCursorAtTheEnd = () => {
  const state = createPageEditorState(listOfOnePoint, 'Select block');
  const endOfText = state.doc.resolve(state.doc.content.size - 3);
  return state.apply(state.tr.setSelection(TextSelection.near(endOfText)));
};

const press = (command: Command): { readonly blocks: number; readonly handled: boolean; readonly points: number } => {
  const state = withCursorAtTheEnd();
  let next: EditorState = state;
  const handled = command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return { blocks: next.doc.childCount, handled, points: next.doc.firstChild?.childCount ?? 0 };
};

describe('Enter at the end of a point in a list', () => {
  it('gains the list another point', () => {
    const { handled, points, blocks } = press(splitListItem(pageEditorSchema.nodes.list_item));

    expect(handled).toBe(true);
    expect(blocks).toBe(1);
    expect(points).toBe(2);
  });

  it('is claimed by the general rule too, which is why the order between them decides', () => {
    const generalEnter = baseKeymap.Enter;
    if (generalEnter === undefined) throw new Error('the general keymap no longer binds Enter');

    const { handled, points } = press(generalEnter);

    expect(handled).toBe(true);
    expect(points).not.toBe(2);
  });
});
