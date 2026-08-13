import { describe, expect, it } from 'bun:test';
import { TextSelection } from 'prosemirror-state';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';
import type { PageContent } from '@/modules/pages/types/pages.types';

const paragraphWithBrokenLine: PageContent = {
  content: [
    {
      content: [
        { text: 'Primera linea', type: 'text' },
        { type: 'hard_break' },
        { text: 'Segunda linea', type: 'text' },
      ],
      type: 'paragraph',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
};

describe('a line broken on purpose', () => {
  it('travels through the editor and back out without changing shape', () => {
    const state = createPageEditorState(paragraphWithBrokenLine, 'Select block');

    expect(serializePageEditorState(state)).toEqual(paragraphWithBrokenLine);
  });

  it('stays one block, so the writing does not get split in two', () => {
    const state = createPageEditorState(paragraphWithBrokenLine, 'Select block');

    expect(state.doc.childCount).toBe(1);
    expect(state.doc.firstChild?.type.name).toBe('paragraph');
  });

  it('can be placed where the cursor is', () => {
    const state = createPageEditorState(
      { content: [{ content: [{ text: 'Uno', type: 'text' }], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
      'Select block',
    );
    const atTheEnd = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 4)));
    const broken = atTheEnd.apply(atTheEnd.tr.replaceSelectionWith(pageEditorSchema.nodes.hard_break.create()));

    const [firstBlock] = serializePageEditorState(broken).content;

    expect(firstBlock).toMatchObject({
      content: [{ text: 'Uno', type: 'text' }, { type: 'hard_break' }],
      type: 'paragraph',
    });
  });
});
